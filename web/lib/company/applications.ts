import "server-only";
import { getSql } from "@/lib/db/postgres";
import type { ApplicationStatus } from "./constants";

export type ApplicationRow = {
  id: string;
  vacancy_slug: string;
  company_id: string;
  account_id: string;
  resume_file: string | null;
  cover_letter: string;
  contact: string;
  status: ApplicationStatus;
  status_note: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyApplicationRow = ApplicationRow & {
  applicant_email: string;
  applicant_name: string;
};

export async function createApplication(input: {
  vacancySlug: string;
  companyId: string;
  accountId: string;
  resumeFile: string | null;
  coverLetter: string;
  contact: string;
}): Promise<ApplicationRow> {
  const sql = getSql();
  const rows = (await sql`
    insert into applications
      (vacancy_slug, company_id, account_id, resume_file, cover_letter, contact)
    values (
      ${input.vacancySlug}, ${input.companyId}, ${input.accountId},
      ${input.resumeFile}, ${input.coverLetter}, ${input.contact}
    )
    returning *
  `) as ApplicationRow[];
  return rows[0];
}

export async function hasApplied(vacancySlug: string, accountId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    select 1 as one from applications
    where vacancy_slug = ${vacancySlug} and account_id = ${accountId}
    limit 1
  `) as { one: number }[];
  return rows.length > 0;
}

export async function getApplicationById(id: string): Promise<CompanyApplicationRow | null> {
  const sql = getSql();
  const rows = (await sql`
    select ap.*, a.email as applicant_email, a.display_name as applicant_name
    from applications ap
    join careerlab_accounts a on a.id = ap.account_id
    where ap.id = ${id}
    limit 1
  `) as CompanyApplicationRow[];
  return rows[0] ?? null;
}

export async function listApplicationsForAccount(accountId: string): Promise<ApplicationRow[]> {
  const sql = getSql();
  return (await sql`
    select * from applications
    where account_id = ${accountId}
    order by created_at desc
  `) as ApplicationRow[];
}

export async function listApplicationsForCompany(
  companyId: string,
  filters: { vacancySlug?: string; status?: ApplicationStatus } = {},
): Promise<CompanyApplicationRow[]> {
  const sql = getSql();
  return (await sql`
    select ap.*, a.email as applicant_email, a.display_name as applicant_name
    from applications ap
    join careerlab_accounts a on a.id = ap.account_id
    where ap.company_id = ${companyId}
      and (${filters.vacancySlug ?? null}::text is null or ap.vacancy_slug = ${filters.vacancySlug ?? null})
      and (${filters.status ?? null}::text is null or ap.status = ${filters.status ?? null})
    order by ap.created_at desc
  `) as CompanyApplicationRow[];
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  note?: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    update applications set
      status = ${status},
      status_note = ${note ?? null},
      updated_at = now()
    where id = ${id}
  `;
}

/** Отзыв отклика кандидатом. Возвращает имя файла резюме для удаления. */
export async function withdrawApplication(
  id: string,
  accountId: string,
): Promise<{ resumeFile: string | null } | null> {
  const sql = getSql();
  const existing = (await sql`
    select resume_file from applications
    where id = ${id} and account_id = ${accountId}
    limit 1
  `) as { resume_file: string | null }[];
  if (!existing.length) return null;

  await sql`
    update applications set
      status = 'withdrawn',
      resume_file = null,
      updated_at = now()
    where id = ${id} and account_id = ${accountId}
  `;
  return { resumeFile: existing[0].resume_file };
}
