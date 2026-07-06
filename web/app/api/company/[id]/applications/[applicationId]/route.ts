import "server-only";
import { NextResponse } from "next/server";
import { requireCompanyRole, isCompanyAccess } from "@/lib/company/guard";
import { getApplicationById, updateApplicationStatus } from "@/lib/company/applications";
import { getCompanyById } from "@/lib/company/store";
import { getVacancyForApply } from "@/lib/company/vacancies";
import {
  COMPANY_SETTABLE_APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/company/constants";
import { notifyApplicationStatus } from "@/lib/email/company-notifications";
import { pushNotification } from "@/lib/company/notifications-store";

type RouteProps = { params: Promise<{ id: string; applicationId: string }> };

export async function PATCH(req: Request, { params }: RouteProps) {
  const { id, applicationId } = await params;
  const access = await requireCompanyRole(id, "recruiter");
  if (!isCompanyAccess(access)) return access;

  let body: { status?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const status = body.status as ApplicationStatus;
  if (!COMPANY_SETTABLE_APPLICATION_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Некорректный статус." }, { status: 400 });
  }
  const note = String(body.note ?? "").trim().slice(0, 2000) || undefined;

  try {
    const application = await getApplicationById(applicationId);
    if (!application || application.company_id !== id) {
      return NextResponse.json({ error: "Отклик не найден." }, { status: 404 });
    }
    if (application.status === "withdrawn") {
      return NextResponse.json({ error: "Кандидат отозвал отклик." }, { status: 400 });
    }

    await updateApplicationStatus(applicationId, status, note);

    if (status === "invited" || status === "rejected") {
      const [company, vacancy] = await Promise.all([
        getCompanyById(id),
        getVacancyForApply(application.vacancy_slug),
      ]);
      notifyApplicationStatus({
        to: application.applicant_email,
        vacancyTitle: vacancy?.title ?? application.vacancy_slug,
        companyName: company?.name ?? "",
        status,
        note,
      });
      await pushNotification(application.account_id, "application_status", {
        vacancySlug: application.vacancy_slug,
        vacancyTitle: vacancy?.title ?? application.vacancy_slug,
        companyName: company?.name ?? "",
        status,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
