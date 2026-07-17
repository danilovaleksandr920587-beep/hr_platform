import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import type { AuthSession } from "@/lib/auth/token";
import { getUniversityMembership } from "./store";
import { universityRoleAtLeast, type UniversityRole } from "./constants";

export type UniversityAccess = {
  session: AuthSession;
  role: UniversityRole;
};

const ROLE_DENY_MESSAGE: Record<UniversityRole, string> = {
  owner: "Доступно только руководителю карьерного центра.",
  staff: "Нет доступа к кабинету вуза.",
};

/**
 * Проверяет сессию и активное членство в вузе с достаточной ролью.
 * Иерархия: owner > staff (см. universityRoleAtLeast).
 *   minRole 'staff' - любой активный член ЦКС,
 *   'owner' - только руководитель (команда, передача владения).
 * Возвращает UniversityAccess или готовый NextResponse с ошибкой.
 */
export async function requireUniversityRole(
  universityId: string,
  minRole: UniversityRole = "staff",
): Promise<UniversityAccess | NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getUniversityMembership(universityId, session.id);
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Нет доступа к кабинету вуза." }, { status: 403 });
  }
  if (!universityRoleAtLeast(membership.role, minRole)) {
    return NextResponse.json({ error: ROLE_DENY_MESSAGE[minRole] }, { status: 403 });
  }

  return { session, role: membership.role };
}

export function isUniversityAccess(
  value: UniversityAccess | NextResponse,
): value is UniversityAccess {
  return !(value instanceof NextResponse);
}
