import "server-only";
import { getSql } from "@/lib/db/postgres";
import { transliterate } from "@/lib/transliterate";
import type { UniversityRole, UniversityStatus } from "./constants";

export type UniversityRow = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  city: string | null;
  region: string | null;
  logo_url: string | null;
  description: string;
  contacts: Record<string, string>;
  status: UniversityStatus;
  public_stats: boolean;
  email_domains: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type UniversityMembership = UniversityRow & {
  role: UniversityRole;
  member_status: string;
};

export type UniversityMemberRow = {
  account_id: string;
  role: UniversityRole;
  status: string;
  email: string;
  display_name: string;
  created_at: string;
};

export type UniversityInviteRow = {
  id: string;
  university_id: string;
  email: string;
  role: UniversityRole;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type StudentProfileRow = {
  account_id: string;
  university_id: string | null;
  faculty: string;
  study_year: number | null;
  graduation_year: number | null;
  email_verified_domain: boolean;
  updated_at: string;
};

/** Учебный профиль вместе с карточкой выбранного вуза (для кабинета). */
export type StudentProfileWithUniversity = StudentProfileRow & {
  university: Pick<UniversityRow, "id" | "slug" | "name" | "short_name" | "city"> | null;
};

// Справочник ---------------------------------------------------------------

/** Поиск по справочнику для селекта студента (active, ILIKE по названию/городу). */
export async function searchUniversities(
  query: string,
  limit = 20,
): Promise<Pick<UniversityRow, "id" | "slug" | "name" | "short_name" | "city">[]> {
  const sql = getSql();
  const q = query.trim();
  const pattern = `%${q}%`;
  return (await sql`
    select id, slug, name, short_name, city
    from universities
    where status = 'active'
      and (
        ${q} = ''
        or name ilike ${pattern}
        or short_name ilike ${pattern}
        or city ilike ${pattern}
      )
    order by short_name nulls last, name
    limit ${Math.min(Math.max(limit, 1), 50)}
  `) as Pick<UniversityRow, "id" | "slug" | "name" | "short_name" | "city">[];
}

export async function getUniversityById(id: string): Promise<UniversityRow | null> {
  const sql = getSql();
  const rows = (await sql`
    select * from universities where id = ${id} limit 1
  `) as UniversityRow[];
  return rows[0] ?? null;
}

export async function getUniversityBySlug(slug: string): Promise<UniversityRow | null> {
  if (!slug) return null;
  const sql = getSql();
  const rows = (await sql`
    select * from universities where slug = ${slug} limit 1
  `) as UniversityRow[];
  return rows[0] ?? null;
}

// Админ (владелец платформы) -------------------------------------------------

async function uniqueUniversitySlug(name: string): Promise<string> {
  const sql = getSql();
  const base = transliterate(name) || "university";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const rows = (await sql`
      select 1 as one from universities where slug = ${candidate} limit 1
    `) as { one: number }[];
    if (!rows.length) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function createUniversity(input: {
  name: string;
  shortName?: string;
  city?: string;
  region?: string;
  logoUrl?: string;
  createdBy: string;
}): Promise<UniversityRow> {
  const sql = getSql();
  const slug = await uniqueUniversitySlug(input.shortName || input.name);
  const rows = (await sql`
    insert into universities (slug, name, short_name, city, region, logo_url, created_by)
    values (
      ${slug},
      ${input.name.trim()},
      ${input.shortName?.trim() || null},
      ${input.city?.trim() || null},
      ${input.region?.trim() || null},
      ${input.logoUrl?.trim() || null},
      ${input.createdBy}
    )
    returning *
  `) as UniversityRow[];
  return rows[0];
}

export async function updateUniversity(
  id: string,
  patch: {
    name?: string;
    shortName?: string | null;
    city?: string | null;
    region?: string | null;
    logoUrl?: string | null;
    description?: string;
    contacts?: Record<string, string>;
    status?: UniversityStatus;
    publicStats?: boolean;
  },
): Promise<UniversityRow | null> {
  const sql = getSql();
  const rows = (await sql`
    update universities set
      name         = coalesce(${patch.name ?? null}, name),
      short_name   = ${patch.shortName === undefined ? sql`short_name` : patch.shortName},
      city         = ${patch.city === undefined ? sql`city` : patch.city},
      region       = ${patch.region === undefined ? sql`region` : patch.region},
      logo_url     = ${patch.logoUrl === undefined ? sql`logo_url` : patch.logoUrl},
      description  = coalesce(${patch.description ?? null}, description),
      contacts     = coalesce(${patch.contacts ? sql.json(patch.contacts) : null}, contacts),
      status       = coalesce(${patch.status ?? null}, status),
      public_stats = coalesce(${patch.publicStats ?? null}, public_stats),
      updated_at   = now()
    where id = ${id}
    returning *
  `) as UniversityRow[];
  return rows[0] ?? null;
}

/** Все вузы для админ-списка (с числом студентов и членов ЦКС). */
export async function listUniversitiesForAdmin(): Promise<
  (UniversityRow & { student_count: number; member_count: number })[]
> {
  const sql = getSql();
  return (await sql`
    select u.*,
      (select count(*)::int from student_profiles sp where sp.university_id = u.id) as student_count,
      (select count(*)::int from university_members m
        where m.university_id = u.id and m.status = 'active') as member_count
    from universities u
    order by student_count desc, u.name
  `) as (UniversityRow & { student_count: number; member_count: number })[];
}

// Членство ЦКС ---------------------------------------------------------------

export async function listUniversitiesForAccount(
  accountId: string,
): Promise<UniversityMembership[]> {
  const sql = getSql();
  return (await sql`
    select u.*, m.role, m.status as member_status
    from university_members m
    join universities u on u.id = m.university_id
    where m.account_id = ${accountId} and m.status = 'active'
    order by u.created_at
  `) as UniversityMembership[];
}

export async function getUniversityMembership(
  universityId: string,
  accountId: string,
): Promise<{ role: UniversityRole; status: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    select role, status from university_members
    where university_id = ${universityId} and account_id = ${accountId}
    limit 1
  `) as { role: UniversityRole; status: string }[];
  return rows[0] ?? null;
}

export async function listUniversityMembers(
  universityId: string,
): Promise<UniversityMemberRow[]> {
  const sql = getSql();
  return (await sql`
    select m.account_id, m.role, m.status, m.created_at,
           a.email, coalesce(a.display_name, '') as display_name
    from university_members m
    join careerlab_accounts a on a.id = m.account_id
    where m.university_id = ${universityId}
    order by m.created_at
  `) as UniversityMemberRow[];
}

export async function updateUniversityMember(
  universityId: string,
  accountId: string,
  patch: { role?: UniversityRole; status?: "active" | "disabled" },
): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    update university_members set
      role   = coalesce(${patch.role ?? null}, role),
      status = coalesce(${patch.status ?? null}, status)
    where university_id = ${universityId} and account_id = ${accountId}
    returning account_id
  `) as { account_id: string }[];
  return rows.length > 0;
}

// Приглашения (токены - lib/company/invite-token.ts, механика общая) ---------

export async function createUniversityInvite(input: {
  universityId: string;
  email: string;
  role: UniversityRole;
  tokenHash: string;
  expiresAtIso: string;
  invitedBy: string;
}): Promise<UniversityInviteRow> {
  const sql = getSql();
  const rows = (await sql`
    insert into university_invites (university_id, email, role, token_hash, invited_by, expires_at)
    values (
      ${input.universityId}, ${input.email.toLowerCase().trim()}, ${input.role},
      ${input.tokenHash}, ${input.invitedBy}, ${input.expiresAtIso}
    )
    on conflict (university_id, email) do update set
      role = excluded.role,
      token_hash = excluded.token_hash,
      invited_by = excluded.invited_by,
      expires_at = excluded.expires_at,
      accepted_at = null,
      created_at = now()
    returning *
  `) as UniversityInviteRow[];
  return rows[0];
}

export async function listUniversityInvites(
  universityId: string,
): Promise<UniversityInviteRow[]> {
  const sql = getSql();
  return (await sql`
    select id, university_id, email, role, expires_at, accepted_at, created_at
    from university_invites
    where university_id = ${universityId} and accepted_at is null
    order by created_at desc
  `) as UniversityInviteRow[];
}

export type UniversityInviteWithName = UniversityInviteRow & {
  university_name: string;
};

/** Инвайт по хешу токена (+ название вуза для ответа/письма). */
export async function findUniversityInviteByTokenHash(
  tokenHash: string,
): Promise<UniversityInviteWithName | null> {
  const sql = getSql();
  const rows = (await sql`
    select i.id, i.university_id, i.email, i.role, i.expires_at, i.accepted_at,
           i.created_at, coalesce(u.short_name, u.name) as university_name
    from university_invites i
    join universities u on u.id = i.university_id
    where i.token_hash = ${tokenHash}
    limit 1
  `) as UniversityInviteWithName[];
  return rows[0] ?? null;
}

/** Принятие инвайта: активирует членство, помечает инвайт использованным. */
export async function acceptUniversityInvite(
  invite: UniversityInviteWithName,
  accountId: string,
): Promise<void> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`
      insert into university_members (university_id, account_id, role, invited_by)
      values (${invite.university_id}, ${accountId}, ${invite.role}, null)
      on conflict (university_id, account_id) do update set
        role = excluded.role,
        status = 'active'
    `;
    await tx`
      update university_invites set accepted_at = now() where id = ${invite.id}
    `;
  });
}

// Учебный профиль студента (самодекларация) ----------------------------------

export async function getStudentProfile(
  accountId: string,
): Promise<StudentProfileWithUniversity | null> {
  const sql = getSql();
  const rows = (await sql`
    select sp.*,
      u.id as u_id, u.slug as u_slug, u.name as u_name,
      u.short_name as u_short_name, u.city as u_city
    from student_profiles sp
    left join universities u on u.id = sp.university_id
    where sp.account_id = ${accountId}
    limit 1
  `) as (StudentProfileRow & {
    u_id: string | null;
    u_slug: string | null;
    u_name: string | null;
    u_short_name: string | null;
    u_city: string | null;
  })[];
  const row = rows[0];
  if (!row) return null;
  const { u_id, u_slug, u_name, u_short_name, u_city, ...profile } = row;
  return {
    ...profile,
    university: u_id
      ? { id: u_id, slug: u_slug!, name: u_name!, short_name: u_short_name, city: u_city }
      : null,
  };
}

/** Студент выбрал/сменил вуз или учебные поля.
 *  universityId: null - очистить, undefined - не менять текущий выбор. */
export async function upsertStudentProfile(
  accountId: string,
  input: {
    universityId?: string | null;
    faculty?: string;
    studyYear?: number | null;
    graduationYear?: number | null;
  },
): Promise<StudentProfileRow> {
  const sql = getSql();
  // Смена вуза сбрасывает email_verified_domain (подтверждение относилось
  // к прошлому вузу); undefined - оставить и вуз, и флаг как есть.
  const keepUniversity = input.universityId === undefined;
  const rows = (await sql`
    insert into student_profiles (account_id, university_id, faculty, study_year, graduation_year, updated_at)
    values (
      ${accountId},
      ${input.universityId ?? null},
      ${input.faculty?.trim() ?? ""},
      ${input.studyYear ?? null},
      ${input.graduationYear ?? null},
      now()
    )
    on conflict (account_id) do update set
      university_id   = case when ${keepUniversity}
                          then student_profiles.university_id
                          else excluded.university_id end,
      faculty         = excluded.faculty,
      study_year      = excluded.study_year,
      graduation_year = excluded.graduation_year,
      email_verified_domain = case when ${keepUniversity}
                          then student_profiles.email_verified_domain
                          else false end,
      updated_at      = now()
    returning *
  `) as StudentProfileRow[];
  return rows[0];
}
