import "server-only";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createApplication, hasApplied } from "@/lib/company/applications";
import { getVacancyForApply } from "@/lib/company/vacancies";
import { listActiveMemberEmails, listActiveMemberAccountIds } from "@/lib/company/store";
import { saveResumeFile, validateResumeFile, deleteResumeFile } from "@/lib/company/resume-storage";
import { notifyNewApplication } from "@/lib/email/company-notifications";
import { pushNotificationMany } from "@/lib/company/notifications-store";
import { rateLimit } from "@/lib/rate-limit";

type RouteProps = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: RouteProps) {
  const { slug } = await params;
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const coverLetter = String(form.get("coverLetter") ?? "").trim().slice(0, 3000);
  const contact = String(form.get("contact") ?? "").trim().slice(0, 200);
  const resume = form.get("resume");

  if (!(resume instanceof File) || !resume.name) {
    return NextResponse.json({ error: "Прикрепите резюме (PDF или DOCX)." }, { status: 400 });
  }
  const fileError = validateResumeFile(resume);
  if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

  try {
    const vacancy = await getVacancyForApply(slug);
    if (!vacancy) {
      return NextResponse.json({ error: "Вакансия не найдена." }, { status: 404 });
    }
    if (
      vacancy.apply_mode !== "internal" ||
      vacancy.status !== "published" ||
      vacancy.is_archived ||
      !vacancy.company_id
    ) {
      return NextResponse.json(
        { error: "Эта вакансия не принимает отклики на платформе." },
        { status: 400 },
      );
    }
    if (await hasApplied(slug, session.id)) {
      return NextResponse.json(
        { error: "Вы уже откликались на эту вакансию." },
        { status: 409 },
      );
    }

    // Лимит списывается после всех проверок: ошибочная попытка
    // (битый файл, дубль, закрытая вакансия) не сжигает квоту
    if (!rateLimit(`apply:${session.id}`, 10, 24 * 60 * 60)) {
      return NextResponse.json(
        { error: "Не больше 10 откликов в сутки. Продолжите завтра." },
        { status: 429 },
      );
    }

    const fileKey = randomUUID();
    const resumeFile = await saveResumeFile(fileKey, resume);

    try {
      const application = await createApplication({
        vacancySlug: slug,
        companyId: vacancy.company_id,
        accountId: session.id,
        resumeFile,
        coverLetter,
        contact,
      });

      const [emails, memberIds] = await Promise.all([
        listActiveMemberEmails(vacancy.company_id),
        listActiveMemberAccountIds(vacancy.company_id),
      ]);
      const applicantName = session.displayName || session.email;
      notifyNewApplication({
        to: emails,
        vacancyTitle: vacancy.title,
        applicantName,
      });
      await pushNotificationMany(memberIds, "application_new", {
        vacancySlug: slug,
        vacancyTitle: vacancy.title,
        applicantName,
      });

      return NextResponse.json({ ok: true, applicationId: application.id });
    } catch (e: unknown) {
      await deleteResumeFile(resumeFile);
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? String((e as { code: string }).code)
          : "";
      if (code === "23505") {
        return NextResponse.json(
          { error: "Вы уже откликались на эту вакансию." },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
