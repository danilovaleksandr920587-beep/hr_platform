import "server-only";
import { NextResponse } from "next/server";
import { requirePlatformAdmin, isAdminSession } from "@/lib/auth/platform-admin";
import { issueUniversityInvite } from "@/lib/university/invite";
import { UNIVERSITY_ROLES, type UniversityRole } from "@/lib/university/constants";
import { rateLimit } from "@/lib/rate-limit";

type RouteProps = { params: Promise<{ id: string }> };

/** Приглашение ЦКС в кабинет вуза - владельцем платформы (онбординг пилота). */
export async function POST(req: Request, { params }: RouteProps) {
  const session = await requirePlatformAdmin();
  if (!isAdminSession(session)) return session;

  const { id } = await params;
  if (!rateLimit(`university-invite:admin:${id}`, 20, 24 * 60 * 60)) {
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
    const result = await issueUniversityInvite({
      universityId: id,
      email,
      role,
      invitedBy: session.id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: "Вуз не найден." }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, inviteUrl: result.inviteUrl, emailSent: result.emailSent },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
