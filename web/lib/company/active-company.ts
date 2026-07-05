import "server-only";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import type { AuthSession } from "@/lib/auth/token";
import { listCompaniesForAccount, type CompanyMembership } from "./store";

export type ActiveCompanyContext = {
  session: AuthSession;
  company: CompanyMembership;
  companies: CompanyMembership[];
};

/**
 * Для страниц /company/*: требует сессию и хотя бы одну компанию.
 * Без сессии - на логин, без компании - на создание.
 * MVP: активная компания - первая; переключатель появится позже.
 */
export async function requireActiveCompany(nextPath: string): Promise<ActiveCompanyContext> {
  const session = await getSessionFromCookies();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const companies = await listCompaniesForAccount(session.id);
  if (!companies.length) redirect("/company/new");

  return { session, company: companies[0], companies };
}
