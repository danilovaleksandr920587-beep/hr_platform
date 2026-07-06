import "server-only";
import { NextResponse } from "next/server";
import { requireCompanyRole, isCompanyAccess } from "@/lib/company/guard";
import { getCompanyById, upsertInvite } from "@/lib/company/store";
import { generateInviteToken } from "@/lib/company/invite-token";
import { COMPANY_ROLES, type CompanyRole } from "@/lib/company/constants";
import { notifyCompanyInvite } from "@/lib/email/company-notifications";
import { isSmtpConfigured } from "@/lib/email/smtp";
import { rateLimit } from "@/lib/rate-limit";

type RouteProps = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireCompanyRole(id, "admin");
  if (!isCompanyAccess(access)) return access;

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: "Отправка приглашений временно недоступна." },
      { status: 503 },
    );
  }
  if (!rateLimit(`company-invite:${id}`, 20, 24 * 60 * 60)) {
    return NextResponse.json(
      { error: "Слишком много приглашений за сутки." },
      { status: 429 },
    );
  }

  let body: { email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const role = (body.role ?? "recruiter") as CompanyRole;
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Укажите email." }, { status: 400 });
  }
  if (!COMPANY_ROLES.includes(role)) {
    return NextResponse.json({ error: "Некорректная роль." }, { status: 400 });
  }

  try {
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Компания не найдена." }, { status: 404 });
    }

    const generated = generateInviteToken();
    await upsertInvite({
      companyId: id,
      email,
      role,
      tokenHash: generated.tokenHash,
      invitedBy: access.session.id,
      expiresAtIso: generated.expiresAtIso,
    });

    const origin = new URL(req.url).origin;
    notifyCompanyInvite({
      to: email,
      companyName: company.name,
      inviteUrl: `${origin}/company-invite?token=${generated.token}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
