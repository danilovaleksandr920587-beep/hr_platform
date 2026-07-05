import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import type { AuthSession } from "@/lib/auth/token";
import { getMembership } from "./store";
import type { CompanyRole } from "./constants";

export type CompanyAccess = {
  session: AuthSession;
  role: CompanyRole;
};

/**
 * Проверяет сессию и активное членство в компании с достаточной ролью.
 * minRole 'recruiter' - любой активный член, 'owner' - только владелец.
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
  if (minRole === "owner" && membership.role !== "owner") {
    return NextResponse.json({ error: "Доступно только владельцу компании." }, { status: 403 });
  }

  return { session, role: membership.role };
}

export function isCompanyAccess(
  value: CompanyAccess | NextResponse,
): value is CompanyAccess {
  return !(value instanceof NextResponse);
}
