import "server-only";
import { NextResponse } from "next/server";
import { requirePlatformAdmin, isAdminSession } from "@/lib/auth/platform-admin";
import { getUniversityById, createUniversityInvite } from "@/lib/university/store";
import { generateInviteToken } from "@/lib/company/invite-token";
import { UNIVERSITY_ROLES, type UniversityRole } from "@/lib/university/constants";
import { notifyUniversityInvite } from "@/lib/email/university-notifications";
import { isSmtpConfigured } from "@/lib/email/smtp";
import { rateLimit } from "@/lib/rate-limit";
import { getRealOrigin } from "@/lib/http/origin";

type RouteProps = { params: Promise<{ id: string }> };

/** Приглашение ЦКС в кабинет вуза - владельцем платформы (онбординг пилота). */
export async function POST(req: Request, { params }: RouteProps) {
  const session = await requirePlatformAdmin();
  if (!isAdminSession(session)) return session;

  const { id } = await params;
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
  const role = (body.role ?? "owner") as UniversityRole;
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
      invitedBy: session.id,
      expiresAtIso: generated.expiresAtIso,
    });

    const origin = await getRealOrigin();
    const inviteUrl = `${origin}/vuz-invite?token=${generated.token}`;

    // Письмо - если SMTP настроен; ссылку возвращаем всегда, чтобы инвайт
    // можно было передать вручную (онбординг пилота часто идёт через ТГ).
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
