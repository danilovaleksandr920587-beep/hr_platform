import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import type { AuthSession } from "@/lib/auth/token";

/** Email админов платформы: PLATFORM_ADMIN_EMAILS="a@b.ru,c@d.ru" */
export function platformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(email: string): boolean {
  return platformAdminEmails().includes(email.trim().toLowerCase());
}

export async function requirePlatformAdmin(): Promise<AuthSession | NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPlatformAdmin(session.email)) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }
  return session;
}

export function isAdminSession(value: AuthSession | NextResponse): value is AuthSession {
  return !(value instanceof NextResponse);
}
