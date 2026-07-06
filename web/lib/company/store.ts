import "server-only";
import { getSql } from "@/lib/db/postgres";
import { transliterate } from "@/lib/transliterate";
import type { CompanyRole, CompanyStatus } from "./constants";

export type CompanyRow = {
  id: string;
  slug: string;
  name: string;
  inn: string | null;
  website: string | null;
  logo_url: string | null;
  description: string;
  status: CompanyStatus;
  status_reason: string | null;
  trusted: boolean;
  created_by: string | null;
  created_at: string;
};

export type CompanyMembership = CompanyRow & { role: CompanyRole; member_status: string };

export type MemberRow = {
  account_id: string;
  role: CompanyRole;
  status: string;
  email: string;
  display_name: string;
  created_at: string;
};

export type InviteRow = {
  id: string;
  company_id: string;
  email: string;
  role: CompanyRole;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

async function uniqueCompanySlug(name: string): Promise<string> {
  const sql = getSql();
  const base = transliterate(name) || "company";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const rows = (await sql`
      select 1 as one from companies where slug = ${candidate} limit 1
    `) as { one: number }[];
    if (!rows.length) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function createCompany(input: {
  name: string;
  inn?: string;
  website?: string;
  description?: string;
  createdBy: string;
}): Promise<CompanyRow> {
  const sql = getSql();
  const slug = await uniqueCompanySlug(input.name);
  const company = await sql.begin(async (tx) => {
    const rows = (await tx`
      insert into companies (slug, name, inn, website, description, created_by)
      values (
        ${slug},
        ${input.name},
        ${input.inn?.trim() || null},
        ${input.website?.trim() || null},
        ${input.description?.trim() ?? ""},
        ${input.createdBy}
      )
      returning *
    `) as CompanyRow[];
    await tx`
      insert into company_members (company_id, account_id, role)
      values (${rows[0].id}, ${input.createdBy}, 'owner')
    `;
    return rows[0];
  });
  return company as CompanyRow;
}

export async function getCompanyById(id: string): Promise<CompanyRow | null> {
  const sql = getSql();
  const rows = (await sql`
    select * from companies where id = ${id} limit 1
  `) as CompanyRow[];
  return rows[0] ?? null;
}

export async function listCompaniesForAccount(accountId: string): Promise<CompanyMembership[]> {
  const sql = getSql();
  return (await sql`
    select c.*, m.role, m.status as member_status
    from company_members m
    join companies c on c.id = m.company_id
    where m.account_id = ${accountId} and m.status = 'active'
    order by c.created_at
  `) as CompanyMembership[];
}

export async function getMembership(
  companyId: string,
  accountId: string,
): Promise<{ role: CompanyRole; status: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    select role, status from company_members
    where company_id = ${companyId} and account_id = ${accountId}
    limit 1
  `) as { role: CompanyRole; status: string }[];
  return rows[0] ?? null;
}

export async function updateCompanyProfile(
  id: string,
  fields: { name?: string; inn?: string; website?: string; description?: string; logoUrl?: string },
): Promise<void> {
  const sql = getSql();
  await sql`
    update companies set
      name        = coalesce(${fields.name ?? null}, name),
      inn         = coalesce(${fields.inn ?? null}, inn),
      website     = coalesce(${fields.website ?? null}, website),
      description = coalesce(${fields.description ?? null}, description),
      logo_url    = coalesce(${fields.logoUrl ?? null}, logo_url),
      updated_at  = now()
    where id = ${id}
  `;
}

export async function listMembers(companyId: string): Promise<MemberRow[]> {
  const sql = getSql();
  return (await sql`
    select m.account_id, m.role, m.status, m.created_at, a.email, a.display_name
    from company_members m
    join careerlab_accounts a on a.id = m.account_id
    where m.company_id = ${companyId}
    order by m.created_at
  `) as MemberRow[];
}

/** Email активных членов компании (для уведомлений о новых откликах). */
export async function listActiveMemberEmails(companyId: string): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`
    select a.email
    from company_members m
    join careerlab_accounts a on a.id = m.account_id
    where m.company_id = ${companyId} and m.status = 'active'
  `) as { email: string }[];
  return rows.map((r) => r.email);
}

/** account_id активных членов компании (для in-app уведомлений). */
export async function listActiveMemberAccountIds(companyId: string): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`
    select account_id from company_members
    where company_id = ${companyId} and status = 'active'
  `) as { account_id: string }[];
  return rows.map((r) => r.account_id);
}

export async function updateMember(
  companyId: string,
  accountId: string,
  fields: { role?: CompanyRole; status?: "active" | "disabled" },
): Promise<void> {
  const sql = getSql();
  await sql`
    update company_members set
      role   = coalesce(${fields.role ?? null}, role),
      status = coalesce(${fields.status ?? null}, status)
    where company_id = ${companyId} and account_id = ${accountId}
  `;
}

export async function countOwners(companyId: string): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    select count(*)::int as n from company_members
    where company_id = ${companyId} and role = 'owner' and status = 'active'
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}

// Приглашения ----------------------------------------------------------

export async function upsertInvite(input: {
  companyId: string;
  email: string;
  role: CompanyRole;
  tokenHash: string;
  invitedBy: string;
  expiresAtIso: string;
}): Promise<void> {
  const sql = getSql();
  await sql`
    insert into company_invites (company_id, email, role, token_hash, invited_by, expires_at)
    values (
      ${input.companyId}, ${input.email}, ${input.role},
      ${input.tokenHash}, ${input.invitedBy}, ${input.expiresAtIso}
    )
    on conflict (company_id, email) do update set
      role = excluded.role,
      token_hash = excluded.token_hash,
      invited_by = excluded.invited_by,
      expires_at = excluded.expires_at,
      accepted_at = null,
      created_at = now()
  `;
}

export async function listInvites(companyId: string): Promise<InviteRow[]> {
  const sql = getSql();
  return (await sql`
    select id, company_id, email, role, expires_at, accepted_at, created_at
    from company_invites
    where company_id = ${companyId}
    order by created_at desc
  `) as InviteRow[];
}

export type InviteWithCompany = InviteRow & { company_name: string };

export async function findInviteByTokenHash(tokenHash: string): Promise<InviteWithCompany | null> {
  const sql = getSql();
  const rows = (await sql`
    select i.id, i.company_id, i.email, i.role, i.expires_at, i.accepted_at, i.created_at,
           c.name as company_name
    from company_invites i
    join companies c on c.id = i.company_id
    where i.token_hash = ${tokenHash}
    limit 1
  `) as InviteWithCompany[];
  return rows[0] ?? null;
}

/** Принять приглашение: активировать членство и пометить инвайт. */
export async function acceptInvite(invite: InviteWithCompany, accountId: string): Promise<void> {
  const sql = getSql();
  await sql`
    insert into company_members (company_id, account_id, role, invited_by)
    values (${invite.company_id}, ${accountId}, ${invite.role}, ${null})
    on conflict (company_id, account_id) do update set
      role = excluded.role,
      status = 'active'
  `;
  await sql`
    update company_invites set accepted_at = now() where id = ${invite.id}
  `;
}

// Модерация (админ платформы) -------------------------------------------

export async function listPendingCompanies(): Promise<CompanyRow[]> {
  const sql = getSql();
  return (await sql`
    select * from companies where status = 'pending' order by created_at
  `) as CompanyRow[];
}

export async function setCompanyStatus(
  id: string,
  status: CompanyStatus,
  reason?: string,
  trusted?: boolean,
): Promise<void> {
  const sql = getSql();
  await sql`
    update companies set
      status = ${status},
      status_reason = ${reason ?? null},
      trusted = coalesce(${trusted ?? null}, trusted),
      updated_at = now()
    where id = ${id}
  `;
}

export async function getCompanyOwnerEmails(companyId: string): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`
    select a.email
    from company_members m
    join careerlab_accounts a on a.id = m.account_id
    where m.company_id = ${companyId} and m.role = 'owner' and m.status = 'active'
  `) as { email: string }[];
  return rows.map((r) => r.email);
}

export async function getCompanyOwnerAccountIds(companyId: string): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`
    select account_id from company_members
    where company_id = ${companyId} and role = 'owner' and status = 'active'
  `) as { account_id: string }[];
  return rows.map((r) => r.account_id);
}
