import "server-only";
import { NextResponse } from "next/server";
import { requireUniversityRole, isUniversityAccess } from "@/lib/university/guard";
import { getUniversityById, createUniversityInvite } from "@/lib/university/store";
import { generateInviteToken } from "@/lib/company/invite-token";
import { UNIVERSITY_ROLES, type UniversityRole } from "@/lib/university/constants";
import { notifyUniversityInvite } from "@/lib/email/university-notifications";
import { isSmtpConfigured } from "@/lib/email/smtp";
import { rateLimit } from "@/lib/rate-limit";
import { getRealOrigin } from "@/lib/http/origin";

type RouteProps = { params: Promise<{ id: string }> };

/** Owner ЦКС приглашает коллег (staff/owner) в кабинет вуза. */
export async function POST(req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireUniversityRole(id, "owner");
  if (!isUniversityAccess(access)) return access;

  if (!rateLimit(`university-invite:${id}`, 20, 24 * 60 * 60)) {
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
  const role = (body.role ?? "staff") as UniversityRole;
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Укажите email." }, { status: 400 });
  }
  if (!UNIVERSITY_ROLES.includes(role)) {
    return NextResponse.json({ error: "Некорректная роль." }, { status: 400 });
  }

  try {
    const university = await getUniversityById(id);
    if (!university) {
      return NextResponse.json({ error: "Вуз не найден." }, { status: 404 });
    }

    const generated = generateInviteToken();
    await createUniversityInvite({
      universityId: id,
      email,
      role,
      tokenHash: generated.tokenHash,
      invitedBy: access.session.id,
      expiresAtIso: generated.expiresAtIso,
    });

    const origin = await getRealOrigin();
    const inviteUrl = `${origin}/vuz-invite?token=${generated.token}`;

    const emailSent = isSmtpConfigured();
    if (emailSent) {
      notifyUniversityInvite({
        to: email,
        universityName: university.short_name || university.name,
        inviteUrl,
      });
    }

    return NextResponse.json({ ok: true, inviteUrl, emailSent }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
