import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import type { AuthSession } from "@/lib/auth/token";
import { listCompaniesForAccount, type CompanyMembership } from "./store";
import { ACTIVE_COMPANY_COOKIE } from "./active-company-cookie";

export { ACTIVE_COMPANY_COOKIE };

export type ActiveCompanyContext = {
  session: AuthSession;
  company: CompanyMembership;
  companies: CompanyMembership[];
};

/**
 * Для страниц /company/*: требует сессию и хотя бы одну компанию.
 * Без сессии - на логин, без компании - на создание.
 * Активная компания - из cookie cl_active_company (если аккаунт в ней состоит),
 * иначе первая из членств. Переключатель - в CompanyNav.
 */
export async function requireActiveCompany(nextPath: string): Promise<ActiveCompanyContext> {
  const session = await getSessionFromCookies();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const companies = await listCompaniesForAccount(session.id);
  if (!companies.length) redirect("/company/new");

  const jar = await cookies();
  const activeId = jar.get(ACTIVE_COMPANY_COOKIE)?.value;
  const company = companies.find((c) => c.id === activeId) ?? companies[0];

  return { session, company, companies };
}
