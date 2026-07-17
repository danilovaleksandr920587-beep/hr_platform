import "server-only";
import { getSql } from "@/lib/db/postgres";
import type { UniversityRow } from "./store";
import { UNIVERSITY_STATS_MIN_GROUP } from "./constants";

/**
 * Публичные (SEO) данные вузов для витрины /universities/[slug].
 * Наружу - только active-вузы; служебные поля (email_domains, created_by)
 * не выносим. Публичные цифры - только если public_stats включён ЦКС и
 * студентов не меньше порога (защита малых выборок, vuz-portal-design.md §6).
 */
export type PublicUniversity = Pick<
  UniversityRow,
  | "id"
  | "slug"
  | "name"
  | "short_name"
  | "city"
  | "region"
  | "logo_url"
  | "description"
  | "contacts"
  | "created_at"
>;

export type PublicUniversityStats = {
  student_count: number;
} | null;

export async function getPublicUniversityBySlug(
  slug: string,
): Promise<PublicUniversity | null> {
  if (!slug) return null;
  const sql = getSql();
  const rows = (await sql`
    select id, slug, name, short_name, city, region, logo_url, description,
           contacts, created_at
    from universities
    where slug = ${slug} and status = 'active'
    limit 1
  `) as PublicUniversity[];
  return rows[0] ?? null;
}

/** Публичные цифры витрины: только при public_stats и выше порога. */
export async function getPublicUniversityStats(
  universityId: string,
): Promise<PublicUniversityStats> {
  const sql = getSql();
  const rows = (await sql`
    select
      (select count(*)::int from student_profiles sp
        where sp.university_id = u.id) as student_count,
      u.public_stats
    from universities u
    where u.id = ${universityId}
    limit 1
  `) as { student_count: number; public_stats: boolean }[];
  const row = rows[0];
  if (!row || !row.public_stats) return null;
  if (row.student_count < UNIVERSITY_STATS_MIN_GROUP) return null;
  return { student_count: row.student_count };
}

/** Вузы с заполненной витриной - для каталога и sitemap (active + description). */
export async function listPublicUniversities(): Promise<PublicUniversity[]> {
  const sql = getSql();
  return (await sql`
    select id, slug, name, short_name, city, region, logo_url, description,
           contacts, created_at
    from universities
    where status = 'active' and description <> ''
    order by name
  `) as PublicUniversity[];
}

/** Слаги заполненных витрин - для sitemap и generateStaticParams.
 *  Вузы из сида без контента ЦКС в карту не попадают (SEO-гигиена §7). */
export async function listPublicUniversitySlugs(): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`
    select slug from universities
    where status = 'active' and description <> ''
    order by slug
  `) as { slug: string }[];
  return rows.map((r) => r.slug);
}
