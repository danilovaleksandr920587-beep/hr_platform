import "server-only";
import { NextResponse } from "next/server";
import { requirePlatformAdmin, isAdminSession } from "@/lib/auth/platform-admin";
import {
  getCompanyById,
  getCompanyOwnerEmails,
  getCompanyOwnerAccountIds,
  setCompanyStatus,
} from "@/lib/company/store";
import { notifyCompanyModeration } from "@/lib/email/company-notifications";
import { pushNotificationMany } from "@/lib/company/notifications-store";

type RouteProps = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteProps) {
  const { id } = await params;
  const admin = await requirePlatformAdmin();
  if (!isAdminSession(admin)) return admin;

  let body: { approve?: boolean; reason?: string; trusted?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const approve = Boolean(body.approve);
  const reason = String(body.reason ?? "").trim().slice(0, 1000) || undefined;

  try {
    const company = await getCompanyById(id);
    if (!company) return NextResponse.json({ error: "Компания не найдена." }, { status: 404 });

    await setCompanyStatus(
      id,
      approve ? "verified" : "rejected",
      reason,
      body.trusted !== undefined ? Boolean(body.trusted) : undefined,
    );

    const [owners, ownerIds] = await Promise.all([
      getCompanyOwnerEmails(id),
      getCompanyOwnerAccountIds(id),
    ]);
    notifyCompanyModeration({
      to: owners,
      companyName: company.name,
      approved: approve,
      reason,
    });
    await pushNotificationMany(ownerIds, "company_moderation", {
      companyName: company.name,
      approved: approve,
      reason: reason ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
