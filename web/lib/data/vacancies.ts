import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPublishedSlugsFromRest } from "@/lib/supabase/rest-anon";
import type { VacancyRow } from "@/lib/types";
import {
  isVacancySchemaMismatchError,
  normalizeVacancyRow,
  vacancyShapes,
  VACANCY_SELECT_ROOT_CARD,
  VACANCY_SELECT_ROOT,
  VACANCY_SELECT_WEB_CARD,
  VACANCY_SELECT_WEB,
  type VacancyDbShape,
} from "@/lib/data/vacancy-schema";
import {
  EXP_LABELS,
  FORMAT_LABELS,
  SPHERE_LABELS,
  TYPE_LABELS,
  type FilterOption,
} from "@/lib/vacancy-labels";

export type VacancyFilters = {
  q?: string;
  sphere?: string[];
  city?: string[];
  exp?: string[];
  format?: string[];
  type?: string[];
  salaryFrom?: number | null;
  salaryTo?: number | null;
  limit?: number;
  fields?: "full" | "card";
};

function escapeIlikeTerm(value: string): string {
  return value.replace(/[%_]/g, "\\$&").replace(/,/g, "\\,");
}

function applyCommonFilters<
  T extends {
    in: (col: string, vals: string[]) => T;
    not: (col: string, op: string, val: null) => T;
    lte: (col: string, val: number) => T;
    gte: (col: string, val: number) => T;
  },
>(q: T, shape: VacancyDbShape, filters: VacancyFilters): T {
  const spheres = filters.sphere?.filter(Boolean) ?? [];
  const cities = filters.city?.filter(Boolean) ?? [];
  const exps = filters.exp?.filter(Boolean) ?? [];
  const formats = filters.format?.filter(Boolean) ?? [];
  const types = filters.type?.filter(Boolean) ?? [];

  if (spheres.length) q = q.in("sphere", spheres);
  if (cities.length) q = q.in("city", cities);
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

function countOptions(rows: VacancyRow[], key: keyof VacancyRow): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    const val = row[key];
    if (typeof val !== "string") continue;
    const v = val.trim();
    if (!v) continue;
    out.set(v, (out.get(v) ?? 0) + 1);
  }
  return out;
}

export async function listVacancyFilterOptions(): Promise<{
  sphere: FilterOption[];
  city: FilterOption[];
  exp: FilterOption[];
  format: FilterOption[];
  type: FilterOption[];
}> {
  const rows = await listVacancies({ fields: "card", limit: 1000 });
  const sphereCounts = countOptions(rows, "sphere");
  const cityCounts = countOptions(rows, "city");
  const expCounts = countOptions(rows, "exp");
  const formatCounts = countOptions(rows, "format");
  const typeCounts = countOptions(rows, "type");

  const mapOptions = (
    counts: Map<string, number>,
    labels: Record<string, string>,
  ): FilterOption[] =>
    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({
        value,
        label: labels[value] ?? value,
        count,
      }));

  return {
    sphere: mapOptions(sphereCounts, SPHERE_LABELS),
    city: Array.from(cityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count })),
    exp: mapOptions(expCounts, EXP_LABELS),
    format: mapOptions(formatCounts, FORMAT_LABELS),
    type: mapOptions(typeCounts, TYPE_LABELS),
  };
}

export async function listVacancies(
  filters: VacancyFilters = {},
): Promise<VacancyRow[]> {
  if (!isPublicSupabaseConfigured()) return [];

  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const shapes = vacancyShapes();
  const fieldMode = filters.fields ?? "full";
  const needle = filters.q?.trim();
  const sb: any = supabase;

  for (const shape of shapes) {
    const select =
      shape === "web"
        ? fieldMode === "card"
          ? VACANCY_SELECT_WEB_CARD
          : VACANCY_SELECT_WEB
        : fieldMode === "card"
          ? VACANCY_SELECT_ROOT_CARD
          : VACANCY_SELECT_ROOT;
    let q: any = sb
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
    if (needle) {
      const term = `%${escapeIlikeTerm(needle)}%`;
      q =
        shape === "web"
          ? q.or(
              `title.ilike.${term},company.ilike.${term},search_document.ilike.${term}`,
            )
          : q.or(
              `title.ilike.${term},company.ilike.${term},description.ilike.${term}`,
            );
    }
    if (filters.limit && filters.limit > 0) {
      q = q.limit(filters.limit);
    }

    const { data, error } = await q;
    if (error) {
      if (shapes.length > 1 && isVacancySchemaMismatchError(error)) {
        continue;
      }
      console.error("listVacancies", error.message);
      return [];
    }

    const rawRows = (data ?? []) as unknown[];
    const rows = rawRows.map((r) =>
      normalizeVacancyRow(r as Record<string, unknown>),
    );
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
  const sb: any = supabase;
  for (const shape of shapes) {
    const select = shape === "web" ? VACANCY_SELECT_WEB : VACANCY_SELECT_ROOT;
    const { data, error } = await sb
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

export async function listVacanciesBySlugs(slugs: string[]): Promise<VacancyRow[]> {
  if (!isPublicSupabaseConfigured()) return [];
  const clean = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (!clean.length) return [];

  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  const sb: any = supabase;
  const shapes = vacancyShapes();

  for (const shape of shapes) {
    const select = shape === "web" ? VACANCY_SELECT_WEB_CARD : VACANCY_SELECT_ROOT_CARD;
    const { data, error } = await sb
      .from("vacancies")
      .select(select)
      .in("slug", clean)
      .eq("is_published", true);
    if (error) {
      if (shapes.length > 1 && isVacancySchemaMismatchError(error)) continue;
      console.error("listVacanciesBySlugs", error.message);
      return [];
    }
    const normalized = ((data ?? []) as unknown[]).map((r) =>
      normalizeVacancyRow(r as Record<string, unknown>),
    );
    const bySlug = new Map(normalized.map((v) => [v.slug, v] as const));
    return clean.map((slug) => bySlug.get(slug)).filter((v): v is VacancyRow => Boolean(v));
  }
  return [];
}
