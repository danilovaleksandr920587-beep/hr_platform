import type { VacancyRow } from "@/lib/types";

/** Схема из web/supabase/migrations (поля type, featured, search_document). */
export const VACANCY_SELECT_WEB =
  "id,slug,title,company,description,description_blocks,sphere,exp,format,type,salary_min,salary_max,apply_url,search_document,featured,published_at,company_about,company_logo_url,city,skills,source_published_at";
export const VACANCY_SELECT_WEB_CARD =
  "id,slug,title,company,description,city,skills,source_published_at,company_logo_url,sphere,exp,format,type,salary_min,salary_max,apply_url,featured,published_at";

/** Схема из supabase/migrations в корне репо (employment_type, is_featured). */
export const VACANCY_SELECT_ROOT =
  "id,slug,title,company,description,description_blocks,sphere,exp,format,employment_type,salary_min,salary_max,apply_url,published_at,is_featured,company_about,company_logo_url,city,skills,source_published_at";
export const VACANCY_SELECT_ROOT_CARD =
  "id,slug,title,company,description,city,skills,source_published_at,company_logo_url,sphere,exp,format,employment_type,salary_min,salary_max,apply_url,published_at,is_featured";

export type VacancyDbShape = "web" | "root";

export function vacancyShapes(): VacancyDbShape[] {
  const env = process.env.NEXT_PUBLIC_VACANCIES_SCHEMA?.trim().toLowerCase();
  if (env === "web") return ["web"];
  if (env === "root") return ["root"];
  return ["root", "web"];
}

export function isVacancySchemaMismatchError(err: {
  message?: string;
  details?: string;
  code?: string;
}): boolean {
  const t = `${err.message ?? ""} ${err.details ?? ""} ${err.code ?? ""}`.toLowerCase();
  return /column .* does not exist|Could not find the|PGRST204|schema cache/i.test(
    t,
  );
}

export function normalizeVacancyRow(
  row: Record<string, unknown>,
): VacancyRow {
  const type =
    (row.type as string | undefined) ??
    (row.employment_type as string | undefined) ??
    "internship";
  const featured = Boolean(row.featured ?? row.is_featured);
  const desc =
    row.description != null ? String(row.description) : null;
  const sdRaw = row.search_document;
  const search_document =
    typeof sdRaw === "string" && sdRaw.length > 0
      ? sdRaw
      : desc != null && desc.length > 0
        ? desc
        : "";

  const skillsRaw = row.skills;
  const skills = Array.isArray(skillsRaw)
    ? (skillsRaw as unknown[]).map(String)
    : null;
  const blocksRaw = row.description_blocks;
  const description_blocks = Array.isArray(blocksRaw)
    ? blocksRaw
        .map((block) => {
          if (!block || typeof block !== "object") return null;
          const rec = block as Record<string, unknown>;
          const itemsRaw = rec.items;
          return {
            kind:
              typeof rec.kind === "string"
                ? rec.kind
                : "other",
            title:
              typeof rec.title === "string" && rec.title.length > 0
                ? rec.title
                : "О роли",
            body: typeof rec.body === "string" ? rec.body : null,
            items: Array.isArray(itemsRaw) ? itemsRaw.map(String).filter(Boolean) : [],
          };
        })
        .filter(Boolean)
    : null;

  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    company: String(row.company),
    description: desc,
    description_blocks: description_blocks as VacancyRow["description_blocks"],
    sphere: String(row.sphere),
    exp: String(row.exp),
    format: String(row.format),
    type,
    salary_min: (row.salary_min as number | null) ?? null,
    salary_max: (row.salary_max as number | null) ?? null,
    apply_url: (row.apply_url as string | null | undefined) ?? null,
    search_document,
    featured,
    published_at: String(row.published_at),
    company_about: (row.company_about as string | null | undefined) ?? null,
    company_logo_url: (row.company_logo_url as string | null | undefined) ?? null,
    city: (row.city as string | null | undefined) ?? null,
    skills,
    source_published_at: (row.source_published_at as string | null | undefined) ?? null,
  };
}
