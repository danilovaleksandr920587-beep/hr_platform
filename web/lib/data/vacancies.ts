import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPublishedSlugsFromRest } from "@/lib/supabase/rest-anon";
import type { VacancyRow } from "@/lib/types";
import {
  isVacancySchemaMismatchError,
  normalizeVacancyRow,
  vacancyShapes,
  VACANCY_SELECT_ROOT,
  VACANCY_SELECT_WEB,
  type VacancyDbShape,
} from "@/lib/data/vacancy-schema";

export type VacancyFilters = {
  q?: string;
  sphere?: string[];
  exp?: string[];
  format?: string[];
  type?: string[];
  salaryFrom?: number | null;
  salaryTo?: number | null;
};

function applyCommonFilters<
  T extends {
    in: (col: string, vals: string[]) => T;
    not: (col: string, op: string, val: null) => T;
    lte: (col: string, val: number) => T;
    gte: (col: string, val: number) => T;
  },
>(q: T, shape: VacancyDbShape, filters: VacancyFilters): T {
  const spheres = filters.sphere?.filter(Boolean) ?? [];
  const exps = filters.exp?.filter(Boolean) ?? [];
  const formats = filters.format?.filter(Boolean) ?? [];
  const types = filters.type?.filter(Boolean) ?? [];

  if (spheres.length) q = q.in("sphere", spheres);
  if (exps.length) q = q.in("exp", exps);
  if (formats.length) q = q.in("format", formats);

  const typeCol = shape === "web" ? "type" : "employment_type";
  if (types.length) q = q.in(typeCol, types);

  const sf = filters.salaryFrom;
  const st = filters.salaryTo;
  const salaryOn = sf != null || st != null;
  if (salaryOn) {
    const lo = sf ?? 0;
    const hi = st ?? 999_999_999;
    q = q
      .not("salary_min", "is", null)
      .not("salary_max", "is", null)
      .lte("salary_min", hi)
      .gte("salary_max", lo);
  }
  return q;
}

export async function listVacancies(
  filters: VacancyFilters = {},
): Promise<VacancyRow[]> {
  if (!isPublicSupabaseConfigured()) return [];

  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const shapes = vacancyShapes();

  for (const shape of shapes) {
    const select = shape === "web" ? VACANCY_SELECT_WEB : VACANCY_SELECT_ROOT;
    let q = supabase
      .from("vacancies")
      .select(select)
      .eq("is_published", true);

    q =
      shape === "web"
        ? q
            .order("featured", { ascending: false })
            .order("published_at", { ascending: false })
        : q
            .order("is_featured", { ascending: false })
            .order("published_at", { ascending: false });

    q = applyCommonFilters(q, shape, filters);

    const { data, error } = await q;
    if (error) {
      if (shapes.length > 1 && isVacancySchemaMismatchError(error)) {
        continue;
      }
      console.error("listVacancies", error.message);
      return [];
    }

    const rawRows = (data ?? []) as unknown[];
    let rows = rawRows.map((r) =>
      normalizeVacancyRow(r as Record<string, unknown>),
    );
    const needle = filters.q?.trim().toLowerCase();
    if (needle) {
      rows = rows.filter((row) => {
        const hay =
          `${row.title} ${row.company} ${row.search_document ?? ""}`.toLowerCase();
        return hay.includes(needle);
      });
    }
    return rows;
  }

  return [];
}

export async function getVacancyBySlug(
  slug: string,
): Promise<VacancyRow | null> {
  if (!isPublicSupabaseConfigured() || !slug) return null;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;

  const shapes = vacancyShapes();
  for (const shape of shapes) {
    const select = shape === "web" ? VACANCY_SELECT_WEB : VACANCY_SELECT_ROOT;
    const { data, error } = await supabase
      .from("vacancies")
      .select(select)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      if (shapes.length > 1 && isVacancySchemaMismatchError(error)) {
        continue;
      }
      console.error("getVacancyBySlug", error.message);
      return null;
    }
    if (!data) return null;
    return normalizeVacancyRow(data as unknown as Record<string, unknown>);
  }
  return null;
}

export async function listVacancySlugs(): Promise<string[]> {
  if (!isPublicSupabaseConfigured()) return [];
  return listPublishedSlugsFromRest("vacancies");
}
