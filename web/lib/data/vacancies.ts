import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { listPublishedSlugsFromRest } from "@/lib/supabase/rest-anon";
import type { VacancyRow } from "@/lib/types";

export type VacancyFilters = {
  q?: string;
  sphere?: string[];
  exp?: string[];
  format?: string[];
  type?: string[];
  salaryFrom?: number | null;
  salaryTo?: number | null;
};

function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.length &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
  );
}

export async function listVacancies(
  filters: VacancyFilters = {},
): Promise<VacancyRow[]> {
  if (!configured()) return [];

  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  let q = supabase
    .from("vacancies")
    .select("*")
    .eq("published", true)
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false });

  const spheres = filters.sphere?.filter(Boolean) ?? [];
  const exps = filters.exp?.filter(Boolean) ?? [];
  const formats = filters.format?.filter(Boolean) ?? [];
  const types = filters.type?.filter(Boolean) ?? [];

  if (spheres.length) q = q.in("sphere", spheres);
  if (exps.length) q = q.in("exp", exps);
  if (formats.length) q = q.in("format", formats);
  if (types.length) q = q.in("type", types);

  const sf = filters.salaryFrom;
  const st = filters.salaryTo;
  const salaryOn = sf != null || st != null;
  if (salaryOn) {
    const lo = sf ?? 0;
    const hi = st ?? 999_999_999;
    // overlap [salary_min, salary_max] with [lo, hi]: vmin <= hi and vmax >= lo
    q = q
      .not("salary_min", "is", null)
      .not("salary_max", "is", null)
      .lte("salary_min", hi)
      .gte("salary_max", lo);
  }

  const { data, error } = await q;
  if (error) {
    console.error("listVacancies", error.message);
    return [];
  }

  let rows = (data ?? []) as VacancyRow[];
  const needle = filters.q?.trim().toLowerCase();
  if (needle) {
    rows = rows.filter((row) => {
      const hay = `${row.title} ${row.company} ${row.search_document ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  return rows;
}

export async function getVacancyBySlug(
  slug: string,
): Promise<VacancyRow | null> {
  if (!configured() || !slug) return null;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("vacancies")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) {
    console.error("getVacancyBySlug", error.message);
    return null;
  }
  return (data as VacancyRow) ?? null;
}

export async function listVacancySlugs(): Promise<string[]> {
  if (!configured()) return [];
  return listPublishedSlugsFromRest("vacancies");
}
