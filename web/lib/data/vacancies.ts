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
import { expandQuery } from "@/lib/search/query";

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
  /** Включить архивные (для sitemap: архив индексируется и приводит трафик) */
  includeArchived?: boolean;
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

export type VacancyFacets = {
  sphere: FilterOption[];
  city: FilterOption[];
  exp: FilterOption[];
  format: FilterOption[];
  type: FilterOption[];
};

/**
 * Счётчики фильтров по ТЕКУЩЕЙ выдаче (RPC `vacancy_facets`).
 *
 * Раньше listVacancyFilterOptions() считала по всей базе без учёта запроса и
 * фильтров: пользователь видел «Аналитика 181», кликал и получал 4. Каждое
 * измерение считается на множестве, отфильтрованном всеми остальными
 * измерениями, - иначе выбор значения обнулял бы собственный список.
 *
 * null - RPC нет, вызывающий уходит на listVacancyFilterOptions().
 */
export async function listVacancyFacets(
  filters: VacancyFilters,
): Promise<VacancyFacets | null> {
  if (!isPublicSupabaseConfigured()) return null;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: any = supabase;

  const needle = filters.q?.trim() ?? "";
  const { data, error } = await sb.rpc("vacancy_facets", {
    q: needle || null,
    q_alts: needle ? expandQuery(needle) : null,
    spheres: emptyToNull(filters.sphere),
    cities: emptyToNull(filters.city),
    exps: emptyToNull(filters.exp),
    formats: emptyToNull(filters.format),
    types: emptyToNull(filters.type),
    salary_from: filters.salaryFrom ?? null,
    salary_to: filters.salaryTo ?? null,
  });

  if (error) {
    if (!isMissingRpc(error)) console.error("listVacancyFacets", error.message);
    return null;
  }

  const buckets: Record<string, Map<string, number>> = {
    sphere: new Map(),
    city: new Map(),
    exp: new Map(),
    format: new Map(),
    type: new Map(),
  };
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const dim = String(row.dimension ?? "");
    const value = String(row.value ?? "").trim();
    if (!buckets[dim] || !value) continue;
    buckets[dim].set(value, Number(row.cnt ?? 0));
  }

  const toOptions = (
    counts: Map<string, number>,
    labels?: Record<string, string>,
  ): FilterOption[] =>
    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({
        value,
        label: labels?.[value] ?? value,
        count,
      }));

  return {
    sphere: toOptions(buckets.sphere, SPHERE_LABELS),
    city: toOptions(buckets.city),
    exp: toOptions(buckets.exp, EXP_LABELS),
    format: toOptions(buckets.format, FORMAT_LABELS),
    type: toOptions(buckets.type, TYPE_LABELS),
  };
}

export async function listVacancyFilterOptions(): Promise<VacancyFacets> {
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

/**
 * Детерминированно «перемешивает» выдачу, чтобы одна компания не занимала
 * длинный сплошной блок (парсер льёт по ~150 вакансий Т-Банка за раз с близким
 * published_at, и раньше они шли подряд). Featured остаются сверху в исходном
 * порядке. Остальные группируются по компании (внутри группы сохраняется
 * исходный порядок по свежести) и каждой вакансии присваивается дробная позиция
 * (i + 0.5) / размер_группы; итог сортируется по этой позиции. Так вакансии
 * каждой компании равномерно распределяются по всему списку: крупный
 * работодатель не образует блок ни в начале, ни в хвосте, а внутри своей группы
 * свежие вакансии всё равно идут раньше. Порядок зависит только от данных,
 * поэтому стабилен между заходами.
 */
export function diversifyVacanciesByCompany(rows: VacancyRow[]): VacancyRow[] {
  const featured = rows.filter((r) => r.featured);
  const rest = rows.filter((r) => !r.featured);

  const groups = new Map<string, VacancyRow[]>();
  for (const row of rest) {
    const key = row.company?.trim().toLowerCase() || row.id;
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  const positioned: { row: VacancyRow; pos: number }[] = [];
  for (const bucket of groups.values()) {
    const n = bucket.length;
    bucket.forEach((row, i) => positioned.push({ row, pos: (i + 0.5) / n }));
  }
  positioned.sort(
    (a, b) =>
      a.pos - b.pos ||
      (b.row.published_at ?? "").localeCompare(a.row.published_at ?? ""),
  );

  return [...featured, ...positioned.map((p) => p.row)];
}

const emptyToNull = (v?: string[]) => {
  const clean = v?.filter(Boolean) ?? [];
  return clean.length ? clean : null;
};

/** RPC отсутствует в базе (миграция не применена или другая схема). Это не
    ошибка: вызывающий уходит на прежний ILIKE-путь. */
function isMissingRpc(error: { code?: string; message?: string }): boolean {
  const code = String(error.code ?? "");
  const msg = String(error.message ?? "").toLowerCase();
  return (
    code === "PGRST202" ||
    msg.includes("could not find the function") ||
    msg.includes("does not exist")
  );
}

export type VacancySearchPage = {
  rows: VacancyRow[];
  /** Всего совпадений в названии/компании/городе/стеке (или всего вакансий,
      если запроса нет). Считается до пагинации. */
  totalPrimary: number;
  /** Всего совпадений только в тексте описания. */
  totalMentions: number;
};

export type VacancySearchParams = VacancyFilters & {
  page?: number;
  perPage?: number;
  /** 1 - основная выдача, 2 - блок «упоминают в описании». */
  onlyTier?: 1 | 2;
};

/**
 * Страница выдачи через RPC `search_vacancies` (миграции 20260809000000 и
 * 20260809120000): websearch_to_tsquery по взвешенному tsvector, ранжирование
 * ts_rank_cd, алиасы запроса, фильтры и пагинация - всё на стороне базы.
 * Заменяет прежний ILIKE '%q%', который выдавал 90% нерелевантного (замеры и
 * разбор - docs/SEARCH_AUDIT.md).
 *
 * Возвращает null, если функции в базе нет - вызывающий тогда собирает
 * страницу сам из listVacancies(). Пустой rows это валидное «ничего не
 * найдено», с отсутствием RPC его не путаем.
 */
export async function searchVacanciesPage(
  params: VacancySearchParams,
): Promise<VacancySearchPage | null> {
  if (!isPublicSupabaseConfigured()) return null;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: any = supabase;

  const needle = params.q?.trim() ?? "";
  const perPage = params.perPage && params.perPage > 0 ? params.perPage : 20;
  const page = params.page && params.page > 0 ? params.page : 1;

  const { data, error } = await sb.rpc("search_vacancies", {
    q: needle || null,
    q_alts: needle ? expandQuery(needle) : null,
    spheres: emptyToNull(params.sphere),
    cities: emptyToNull(params.city),
    exps: emptyToNull(params.exp),
    formats: emptyToNull(params.format),
    types: emptyToNull(params.type),
    salary_from: params.salaryFrom ?? null,
    salary_to: params.salaryTo ?? null,
    include_archived: Boolean(params.includeArchived),
    only_tier: params.onlyTier ?? null,
    page,
    per_page: perPage,
  });

  if (error) {
    if (!isMissingRpc(error)) console.error("searchVacanciesPage", error.message);
    return null;
  }

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows = raw.map((r) => normalizeVacancyRow(r));
  // Тоталы приходят одинаковыми в каждой строке (оконные функции до LIMIT).
  const first = raw[0];
  return {
    rows,
    totalPrimary: Number(first?.total_primary ?? 0),
    totalMentions: Number(first?.total_mentions ?? 0),
  };
}

/**
 * Фолбэк на опечатки: триграммное сходство по названию. Вызывать только когда
 * обычный поиск дал ноль - иначе размывает точную выдачу.
 */
export async function searchVacanciesFuzzy(
  q: string,
  limit = 12,
): Promise<VacancyRow[]> {
  const needle = q.trim();
  if (!needle || !isPublicSupabaseConfigured()) return [];
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: any = supabase;

  const { data, error } = await sb.rpc("search_vacancies_fuzzy", {
    q: needle,
    max_rows: limit,
  });
  if (error) {
    if (!isMissingRpc(error)) console.error("searchVacanciesFuzzy", error.message);
    return [];
  }
  return ((data ?? []) as unknown[]).map((r) =>
    normalizeVacancyRow(r as Record<string, unknown>),
  );
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
  // Keep query builder loosely typed to avoid deep generic instantiation in Next build.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = sb
      .from("vacancies")
      .select(select)
      .eq("is_published", true);
    // Архивные скрываем из листинга, но sitemap запрашивает их (includeArchived)
    if (!filters.includeArchived) q = q.eq("is_archived", false);

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: any = supabase;
  for (const shape of shapes) {
    const select = shape === "web" ? VACANCY_SELECT_WEB : VACANCY_SELECT_ROOT;
    const { data, error } = await sb
      .from("vacancies")
      .select(select)
      .eq("slug", slug)
      .eq("is_published", true)
      // is_archived НЕ фильтруем — страница должна отдаваться для SEO
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

/**
 * Режим отклика вакансии. Толерантен к отсутствию колонки apply_mode
 * (до применения миграции company_portal) - тогда всегда "external".
 */
export async function getVacancyApplyMode(slug: string): Promise<"internal" | "external"> {
  if (!isPublicSupabaseConfigured() || !slug) return "external";
  const supabase = createPublicSupabaseClient();
  if (!supabase) return "external";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: any = supabase;
  const { data, error } = await sb
    .from("vacancies")
    .select("apply_mode")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return "external";
  return data.apply_mode === "internal" ? "internal" : "external";
}

export async function listVacancySlugs(): Promise<string[]> {
  if (!isPublicSupabaseConfigured()) return [];
  return listPublishedSlugsFromRest("vacancies");
}

/**
 * Активные вакансии одной компании (по company_id) - для публичной карточки
 * компании. Читается anon-клиентом (RLS: is_published = true), закреплённые
 * сверху. Толерантно к отсутствию колонки company_id на старой схеме -> [].
 */
export async function listVacanciesByCompanyId(
  companyId: string,
  limit = 50,
): Promise<VacancyRow[]> {
  if (!isPublicSupabaseConfigured() || !companyId) return [];
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: any = supabase;
  const shapes = vacancyShapes();

  for (const shape of shapes) {
    const select = shape === "web" ? VACANCY_SELECT_WEB_CARD : VACANCY_SELECT_ROOT_CARD;
    const featuredCol = shape === "web" ? "featured" : "is_featured";
    const { data, error } = await sb
      .from("vacancies")
      .select(select)
      .eq("company_id", companyId)
      .eq("is_published", true)
      .eq("is_archived", false)
      .order(featuredCol, { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) {
      if (shapes.length > 1 && isVacancySchemaMismatchError(error)) continue;
      console.error("listVacanciesByCompanyId", error.message);
      return [];
    }
    return ((data ?? []) as unknown[]).map((r) =>
      normalizeVacancyRow(r as Record<string, unknown>),
    );
  }
  return [];
}

export async function listVacanciesBySlugs(slugs: string[]): Promise<VacancyRow[]> {
  if (!isPublicSupabaseConfigured()) return [];
  const clean = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (!clean.length) return [];

  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
