import "server-only";
import { NextResponse } from "next/server";
import { requirePlatformAdmin, isAdminSession } from "@/lib/auth/platform-admin";
import { reviewVacancy } from "@/lib/company/vacancies";
import { listActiveMemberEmails, listActiveMemberAccountIds } from "@/lib/company/store";
import { notifyVacancyModeration } from "@/lib/email/company-notifications";
import { pushNotificationMany } from "@/lib/company/notifications-store";

type RouteProps = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: RouteProps) {
  const { slug } = await params;
  const admin = await requirePlatformAdmin();
  if (!isAdminSession(admin)) return admin;

  let body: { approve?: boolean; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const approve = Boolean(body.approve);
  const reason = String(body.reason ?? "").trim().slice(0, 1000) || undefined;

  try {
    const vacancy = await reviewVacancy(slug, approve, reason);

    const [emails, memberIds] = await Promise.all([
      listActiveMemberEmails(vacancy.company_id),
      listActiveMemberAccountIds(vacancy.company_id),
    ]);
    notifyVacancyModeration({
      to: emails,
      vacancyTitle: vacancy.title,
      vacancySlug: vacancy.slug,
      approved: approve,
      reason,
    });
    await pushNotificationMany(memberIds, "vacancy_moderation", {
      vacancyTitle: vacancy.title,
      vacancySlug: vacancy.slug,
      approved: approve,
      reason: reason ?? null,
    });

    return NextResponse.json({ vacancy });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("reviewVacancy")) {
      return NextResponse.json(
        { error: "Вакансия не найдена или уже обработана." },
        { status: 404 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
