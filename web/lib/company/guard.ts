import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import type { AuthSession } from "@/lib/auth/token";
import { getMembership } from "./store";
import { roleAtLeast, type CompanyRole } from "./constants";

export type CompanyAccess = {
  session: AuthSession;
  role: CompanyRole;
};

const ROLE_DENY_MESSAGE: Record<CompanyRole, string> = {
  owner: "Доступно только владельцу компании.",
  admin: "Доступно администраторам компании.",
  recruiter: "Нет доступа к компании.",
};

/**
 * Проверяет сессию и активное членство в компании с достаточной ролью.
 * Иерархия: owner > admin > recruiter (см. roleAtLeast).
 *   minRole 'recruiter' - любой активный член,
 *   'admin' - admin или owner (команда, профиль),
 *   'owner' - только владелец (передача владения, удаление).
 * Возвращает CompanyAccess или готовый NextResponse с ошибкой.
 */
export async function requireCompanyRole(
  companyId: string,
  minRole: CompanyRole = "recruiter",
): Promise<CompanyAccess | NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembership(companyId, session.id);
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Нет доступа к компании." }, { status: 403 });
  }
  if (!roleAtLeast(membership.role, minRole)) {
    return NextResponse.json({ error: ROLE_DENY_MESSAGE[minRole] }, { status: 403 });
  }

  return { session, role: membership.role };
}

export function isCompanyAccess(
  value: CompanyAccess | NextResponse,
): value is CompanyAccess {
  return !(value instanceof NextResponse);
}
