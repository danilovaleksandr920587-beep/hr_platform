import "server-only";
import { getSql } from "@/lib/db/postgres";

/**
 * Публичные (SEO) данные компаний. Компании живут в прямом Postgres
 * (DATABASE_URL, роль с BYPASSRLS) - anon-клиент Supabase их не видит.
 * Наружу отдаём только verified-компании; служебные поля (inn, created_by,
 * status_reason) не выносим.
 */
export type PublicCompany = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  logo_url: string | null;
  description: string;
  trusted: boolean;
  created_at: string;
};

export type PublicCompanyWithCount = PublicCompany & { vacancy_count: number };

/** Демо-компания (песочница /office-demo) не должна попадать в публичный каталог.
 *  SHOW_DEMO_COMPANY=1 отключает скрытие - для локальной разработки и живого
 *  демо клиенту («вот как будет выглядеть ваша карточка»). */
const DEMO_COMPANY_SLUG =
  process.env.SHOW_DEMO_COMPANY === "1" ? "__none__" : "careerlab-demo";

export async function getPublicCompanyBySlug(
  slug: string,
): Promise<PublicCompany | null> {
  if (!slug) return null;
  const sql = getSql();
  if (slug === DEMO_COMPANY_SLUG) return null;
  const rows = (await sql`
    select id, slug, name, website, logo_url, description, trusted, created_at
    from companies
    where slug = ${slug} and status = 'verified'
    limit 1
  `) as PublicCompany[];
  return rows[0] ?? null;
}

export async function getPublicCompanyById(
  id: string,
): Promise<PublicCompany | null> {
  if (!id) return null;
  const sql = getSql();
  const rows = (await sql`
    select id, slug, name, website, logo_url, description, trusted, created_at
    from companies
    where id = ${id} and status = 'verified' and slug <> ${DEMO_COMPANY_SLUG}
    limit 1
  `) as PublicCompany[];
  return rows[0] ?? null;
}

/** Verified-компании с числом активных вакансий (для каталога), крупные сверху. */
export async function listPublicCompanies(): Promise<PublicCompanyWithCount[]> {
  const sql = getSql();
  return (await sql`
    select
      c.id, c.slug, c.name, c.website, c.logo_url, c.description, c.trusted, c.created_at,
      coalesce(v.cnt, 0)::int as vacancy_count
    from companies c
    left join (
      select company_id, count(*) as cnt
      from vacancies
      where is_published = true and is_archived = false and company_id is not null
      group by company_id
    ) v on v.company_id = c.id
    where c.status = 'verified' and c.slug <> ${DEMO_COMPANY_SLUG}
    order by vacancy_count desc, c.created_at desc
  `) as PublicCompanyWithCount[];
}

/** Slug-и verified-компаний (для generateStaticParams и sitemap). */
export async function listPublicCompanySlugs(): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`
    select slug from companies
    where status = 'verified' and slug <> ${DEMO_COMPANY_SLUG}
  `) as { slug: string }[];
  return rows.map((r) => r.slug);
}
