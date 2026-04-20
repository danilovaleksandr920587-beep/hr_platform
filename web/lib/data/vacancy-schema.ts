import type { VacancyRow } from "@/lib/types";

/** Схема из web/supabase/migrations (поля type, featured, search_document). */
export const VACANCY_SELECT_WEB =
  "id,slug,title,company,description,sphere,exp,format,type,salary_min,salary_max,search_document,featured,published_at";
export const VACANCY_SELECT_WEB_CARD =
  "id,slug,title,company,sphere,exp,format,type,salary_min,salary_max,featured,published_at";

/** Схема из supabase/migrations в корне репо (employment_type, is_featured). */
export const VACANCY_SELECT_ROOT =
  "id,slug,title,company,description,sphere,exp,format,employment_type,salary_min,salary_max,published_at,is_featured";
export const VACANCY_SELECT_ROOT_CARD =
  "id,slug,title,company,sphere,exp,format,employment_type,salary_min,salary_max,published_at,is_featured";

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
  const t = `${err.message ?? ""} ${err.details ?? ""} ${err.code ?? ""}`;
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

  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    company: String(row.company),
    description: desc,
    sphere: String(row.sphere),
    exp: String(row.exp),
    format: String(row.format),
    type,
    salary_min: (row.salary_min as number | null) ?? null,
    salary_max: (row.salary_max as number | null) ?? null,
    search_document,
    featured,
    published_at: String(row.published_at),
  };
}
