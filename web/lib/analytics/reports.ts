import "server-only";
import { getSql } from "@/lib/db/postgres";
import {
  DIRECTIONS,
  DIRECTION_LABELS,
  directionFromProfile,
  directionFromSearchQuery,
  directionFromVacancy,
  isDirection,
  type DirectionKey,
} from "@/lib/taxonomy/directions";

/**
 * Отчёты внутреннего дашборда (docs/ANALYTICS.md).
 *
 * Направление считается в TypeScript, а не в SQL: канон и эвристики живут в
 * lib/taxonomy/directions.ts, и второй копии правил быть не должно. Объёмы
 * небольшие (полторы тысячи вакансий, тысячи запросов), дашборд смотрит один
 * человек - разница в скорости незаметна, а расхождения в цифрах исключены.
 */

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(raw: string | string[] | undefined): Period {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return (PERIODS as readonly number[]).includes(value) ? (value as Period) : 30;
}

function emptyByDirection<T>(make: () => T): Record<DirectionKey, T> {
  return Object.fromEntries(DIRECTIONS.map((d) => [d, make()])) as Record<DirectionKey, T>;
}

/* -------------------------------------------------------------------------- */
/* Обзор                                                                       */
/* -------------------------------------------------------------------------- */

export type OverviewReport = {
  hasEvents: boolean;
  totals: {
    visitors: number;
    visits: number;
    pageViews: number;
    vacancyViewers: number;
    registrations: number;
    applyClicks: number;
    applications: number;
    leads: number;
  };
  previous: { visitors: number; visits: number; registrations: number };
  daily: { day: string; visits: number; visitors: number }[];
  channels: { channel: string; visits: number }[];
  pageTypes: { pageType: string; views: number }[];
};

export async function getOverview(days: Period): Promise<OverviewReport> {
  const sql = getSql();

  const [totals] = (await sql`
    select
      count(distinct anon_id)::int                                        as visitors,
      count(distinct session_id)::int                                     as visits,
      count(*) filter (where event = 'page_view')::int                    as page_views,
      count(distinct anon_id) filter (where event = 'vacancy_view')::int  as vacancy_viewers,
      count(*) filter (where event = 'vacancy_apply_click')::int          as apply_clicks,
      count(distinct anon_id) filter (where event = 'company_lead_click')::int as leads
    from public.analytics_events
    where created_at >= now() - make_interval(days => ${days})
  `) as {
    visitors: number;
    visits: number;
    page_views: number;
    vacancy_viewers: number;
    apply_clicks: number;
    leads: number;
  }[];

  const [prev] = (await sql`
    select
      count(distinct anon_id)::int    as visitors,
      count(distinct session_id)::int as visits
    from public.analytics_events
    where created_at >= now() - make_interval(days => ${days * 2})
      and created_at <  now() - make_interval(days => ${days})
  `) as { visitors: number; visits: number }[];

  const daily = (await sql`
    select to_char(created_at at time zone 'Europe/Moscow', 'YYYY-MM-DD') as day,
           count(distinct session_id)::int as visits,
           count(distinct anon_id)::int    as visitors
    from public.analytics_events
    where created_at >= now() - make_interval(days => ${days})
    group by 1
    order by 1
  `) as { day: string; visits: number; visitors: number }[];

  const channels = (await sql`
    select coalesce(channel, 'unknown') as channel, count(distinct session_id)::int as visits
    from public.analytics_events
    where created_at >= now() - make_interval(days => ${days})
    group by 1
    order by 2 desc
  `) as { channel: string; visits: number }[];

  const pageTypes = (await sql`
    select coalesce(page_type, 'unknown') as page_type, count(*)::int as views
    from public.analytics_events
    where event = 'page_view'
      and created_at >= now() - make_interval(days => ${days})
    group by 1
    order by 2 desc
    limit 15
  `) as { page_type: string; views: number }[];

  // Регистрации и отклики берём из своих таблиц, а не из событий: там правда,
  // а событие может не долететь (блокировщик, закрытая вкладка).
  const [reg] = (await sql`
    select
      count(*) filter (where created_at >= now() - make_interval(days => ${days}))::int as current,
      count(*) filter (
        where created_at >= now() - make_interval(days => ${days * 2})
          and created_at <  now() - make_interval(days => ${days})
      )::int as previous
    from public.careerlab_accounts
  `) as { current: number; previous: number }[];

  const [apps] = (await sql`
    select count(*)::int as total
    from public.applications
    where created_at >= now() - make_interval(days => ${days})
  `) as { total: number }[];

  return {
    hasEvents: (totals?.visits ?? 0) > 0,
    totals: {
      visitors: totals?.visitors ?? 0,
      visits: totals?.visits ?? 0,
      pageViews: totals?.page_views ?? 0,
      vacancyViewers: totals?.vacancy_viewers ?? 0,
      registrations: reg?.current ?? 0,
      applyClicks: totals?.apply_clicks ?? 0,
      applications: apps?.total ?? 0,
      leads: totals?.leads ?? 0,
    },
    previous: {
      visitors: prev?.visitors ?? 0,
      visits: prev?.visits ?? 0,
      registrations: reg?.previous ?? 0,
    },
    daily,
    channels,
    pageTypes: pageTypes.map((p) => ({ pageType: p.page_type, views: p.views })),
  };
}

/* -------------------------------------------------------------------------- */
/* Направления                                                                 */
/* -------------------------------------------------------------------------- */

export type DirectionRow = {
  direction: DirectionKey;
  vacancies: number;
  supplyShare: number;
  views: number;
  demandShare: number;
  applyClicks: number;
  ctr: number | null;
  saves: number;
  queries: number;
  zeroResultQueries: number;
  profiles: number;
  legacyViews: number;
  legacyApplyClicks: number;
};

export type DirectionsReport = {
  rows: DirectionRow[];
  hasEvents: boolean;
  /** Запросы, которые словарь направлений не узнал: кандидаты в правила. */
  unclassifiedQueries: { q: string; n: number; minResults: number }[];
};

export async function getDirectionsReport(days: Period): Promise<DirectionsReport> {
  const sql = getSql();

  const vacancyRows = (await sql`
    select slug, sphere, title, skills
    from public.vacancies
    where is_published = true and coalesce(is_archived, false) = false
  `) as { slug: string; sphere: string | null; title: string | null; skills: string[] | null }[];

  const bySlug = new Map<string, DirectionKey>();
  const supply = emptyByDirection(() => 0);
  for (const row of vacancyRows) {
    const direction = directionFromVacancy(row);
    if (!direction) continue;
    bySlug.set(row.slug, direction);
    supply[direction] += 1;
  }

  const eventRows = (await sql`
    select direction,
           count(*) filter (where event = 'vacancy_view')::int        as views,
           count(*) filter (where event = 'vacancy_apply_click')::int as apply_clicks,
           count(*) filter (where event = 'vacancy_save')::int        as saves
    from public.analytics_events
    where created_at >= now() - make_interval(days => ${days})
      and direction is not null
      and event in ('vacancy_view', 'vacancy_apply_click', 'vacancy_save')
    group by 1
  `) as { direction: string; views: number; apply_clicks: number; saves: number }[];

  // Накопительные счётчики vacancy_stats: единственный источник, пока событий
  // мало. Времени в них нет - это всегда «за всё время».
  const legacyRows = (await sql`
    select vacancy_slug, views, apply_clicks from public.vacancy_stats
  `) as { vacancy_slug: string; views: number | string; apply_clicks: number | string }[];

  const queryRows = (await sql`
    select q, results_count from public.search_queries
    where created_at >= now() - make_interval(days => ${days})
  `) as { q: string; results_count: number }[];

  const profileRows = (await sql`
    select direction, count(*)::int as n
    from public.user_profiles
    where coalesce(direction, '') <> ''
    group by 1
  `) as { direction: string; n: number }[];

  const events = emptyByDirection(() => ({ views: 0, apply: 0, saves: 0 }));
  for (const row of eventRows) {
    const key = row.direction as DirectionKey;
    if (!(key in events)) continue;
    events[key] = { views: row.views, apply: row.apply_clicks, saves: row.saves };
  }

  const legacy = emptyByDirection(() => ({ views: 0, apply: 0 }));
  for (const row of legacyRows) {
    const direction = bySlug.get(row.vacancy_slug);
    if (!direction) continue;
    legacy[direction].views += Number(row.views) || 0;
    legacy[direction].apply += Number(row.apply_clicks) || 0;
  }

  const queries = emptyByDirection(() => ({ n: 0, zero: 0 }));
  const unclassified = new Map<string, { n: number; minResults: number }>();
  for (const row of queryRows) {
    const direction = directionFromSearchQuery(row.q);
    if (!direction) {
      const key = row.q.trim().toLowerCase();
      const prev = unclassified.get(key);
      unclassified.set(key, {
        n: (prev?.n ?? 0) + 1,
        minResults: Math.min(prev?.minResults ?? Infinity, row.results_count),
      });
      continue;
    }
    queries[direction].n += 1;
    if (row.results_count === 0) queries[direction].zero += 1;
  }

  const profiles = emptyByDirection(() => 0);
  for (const row of profileRows) {
    const direction = directionFromProfile(row.direction);
    if (direction) profiles[direction] += row.n;
  }

  const totalSupply = Object.values(supply).reduce((a, b) => a + b, 0);
  const hasEvents = eventRows.some((r) => r.views > 0);
  const totalDemand = hasEvents
    ? Object.values(events).reduce((a, e) => a + e.views, 0)
    : Object.values(legacy).reduce((a, e) => a + e.views, 0);

  const rows: DirectionRow[] = DIRECTIONS.map((direction) => {
    const views = hasEvents ? events[direction].views : legacy[direction].views;
    const applyClicks = hasEvents ? events[direction].apply : legacy[direction].apply;
    return {
      direction,
      vacancies: supply[direction],
      supplyShare: totalSupply ? (100 * supply[direction]) / totalSupply : 0,
      views,
      demandShare: totalDemand ? (100 * views) / totalDemand : 0,
      applyClicks,
      ctr: views ? (100 * applyClicks) / views : null,
      saves: events[direction].saves,
      queries: queries[direction].n,
      zeroResultQueries: queries[direction].zero,
      profiles: profiles[direction],
      legacyViews: legacy[direction].views,
      legacyApplyClicks: legacy[direction].apply,
    };
  })
    .filter((r) => r.vacancies || r.views || r.queries || r.profiles)
    .sort((a, b) => b.demandShare - a.demandShare || b.vacancies - a.vacancies);

  const unclassifiedQueries = [...unclassified.entries()]
    .map(([q, v]) => ({ q, n: v.n, minResults: v.minResults }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 25);

  return { rows, hasEvents, unclassifiedQueries };
}

/* -------------------------------------------------------------------------- */
/* Контент                                                                     */
/* -------------------------------------------------------------------------- */

export type ContentReport = {
  hasEvents: boolean;
  clusters: { cluster: string; views: number; reads: number; readRate: number | null }[];
  topArticles: { slug: string; title: string; views: number; reads: number }[];
  weakArticles: { slug: string; title: string; views: number; reads: number }[];
  articleToVacancy: { articleSessions: number; alsoVacancy: number; rate: number | null };
};

export async function getContentReport(days: Period): Promise<ContentReport> {
  const sql = getSql();

  const clusters = (await sql`
    select coalesce(props->>'cluster', 'unknown') as cluster,
           count(*) filter (where event = 'article_view')::int as views,
           count(*) filter (where event = 'article_read')::int as reads
    from public.analytics_events
    where created_at >= now() - make_interval(days => ${days})
      and event in ('article_view', 'article_read')
    group by 1
    order by 2 desc
  `) as { cluster: string; views: number; reads: number }[];

  const perArticle = (await sql`
    select e.entity_id as slug,
           coalesce(a.title, e.entity_id) as title,
           count(*) filter (where e.event = 'article_view')::int as views,
           count(*) filter (where e.event = 'article_read')::int as reads
    from public.analytics_events e
    left join public.articles a on a.slug = e.entity_id
    where e.created_at >= now() - make_interval(days => ${days})
      and e.event in ('article_view', 'article_read')
      and e.entity_id is not null
    group by 1, 2
    having count(*) filter (where e.event = 'article_view') > 0
    order by views desc
  `) as { slug: string; title: string; views: number; reads: number }[];

  // Переход «прочитал статью -> пошёл смотреть вакансии» в рамках одного визита.
  const [bridge] = (await sql`
    with article_sessions as (
      select distinct session_id
      from public.analytics_events
      where event = 'article_view'
        and session_id is not null
        and created_at >= now() - make_interval(days => ${days})
    ),
    vacancy_sessions as (
      select distinct session_id
      from public.analytics_events
      where event = 'vacancy_view'
        and session_id is not null
        and created_at >= now() - make_interval(days => ${days})
    )
    select
      (select count(*) from article_sessions)::int as article_sessions,
      (select count(*) from article_sessions a join vacancy_sessions v using (session_id))::int as also_vacancy
  `) as { article_sessions: number; also_vacancy: number }[];

  const articleSessions = bridge?.article_sessions ?? 0;
  const alsoVacancy = bridge?.also_vacancy ?? 0;

  return {
    hasEvents: perArticle.length > 0,
    clusters: clusters.map((c) => ({
      cluster: c.cluster,
      views: c.views,
      reads: c.reads,
      readRate: c.views ? (100 * c.reads) / c.views : null,
    })),
    topArticles: perArticle.slice(0, 20),
    weakArticles: [...perArticle]
      .filter((a) => a.views >= 10)
      .sort((a, b) => a.reads / a.views - b.reads / b.views)
      .slice(0, 10),
    articleToVacancy: {
      articleSessions,
      alsoVacancy,
      rate: articleSessions ? (100 * alsoVacancy) / articleSessions : null,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Вакансии                                                                    */
/* -------------------------------------------------------------------------- */

type VacancyAttrs = {
  slug: string;
  title: string;
  company: string;
  direction: DirectionKey | null;
  employmentType: string | null;
  exp: string | null;
  format: string | null;
  city: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  source: string | null;
  publishedAt: string | null;
};

type Counts = { views: number; apply: number };

export type SliceRow = {
  key: string;
  label: string;
  vacancies: number;
  views: number;
  apply: number;
  ctr: number | null;
  viewsPerVacancy: number | null;
};

export type VacanciesReport = {
  hasEvents: boolean;
  byEmploymentType: SliceRow[];
  byExp: SliceRow[];
  byFormat: SliceRow[];
  byCity: SliceRow[];
  bySalary: SliceRow[];
  bySource: SliceRow[];
  byCompany: SliceRow[];
  byAge: SliceRow[];
  top: { slug: string; title: string; company: string; views: number; apply: number; ctr: number | null }[];
  worstCtr: { slug: string; title: string; company: string; views: number; apply: number; ctr: number | null }[];
  deadStock: { slug: string; title: string; company: string; ageDays: number }[];
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  internship: "Стажировка",
  project: "Проектная работа",
  parttime: "Подработка",
  // Парсер кладёт и fulltime, хотя в документированном списке типов его нет.
  fulltime: "Полная занятость",
};

const EXP_LABELS_LOCAL: Record<string, string> = {
  none: "Без опыта",
  lt1: "До 1 года",
  "1-3": "1-3 года",
  gte3: "От 3 лет",
};

const FORMAT_LABELS_LOCAL: Record<string, string> = {
  remote: "Удалённо",
  hybrid: "Гибрид",
  office: "Офис",
};

const SOURCE_LABELS: Record<string, string> = {
  parser: "Парсер",
  company: "Кабинет компании",
};

/** Ведро зарплаты: важно не точное значение, а есть ли вилка вообще. */
function salaryBucket(v: VacancyAttrs): string {
  const from = v.salaryMin ?? 0;
  if (!v.salaryMin && !v.salaryMax) return "hidden";
  if (from < 50_000) return "lt50";
  if (from < 100_000) return "50-100";
  if (from < 150_000) return "100-150";
  return "gte150";
}

const SALARY_LABELS: Record<string, string> = {
  hidden: "Не указана",
  lt50: "До 50 тыс",
  "50-100": "50-100 тыс",
  "100-150": "100-150 тыс",
  gte150: "От 150 тыс",
};

function ageBucket(publishedAt: string | null): string {
  if (!publishedAt) return "unknown";
  const days = (Date.now() - new Date(publishedAt).getTime()) / 86_400_000;
  if (days <= 7) return "w1";
  if (days <= 30) return "m1";
  if (days <= 90) return "m3";
  return "old";
}

const AGE_LABELS: Record<string, string> = {
  w1: "До недели",
  m1: "1-4 недели",
  m3: "1-3 месяца",
  old: "Старше 3 месяцев",
  unknown: "Без даты",
};

function buildSlice(
  vacancies: VacancyAttrs[],
  counts: Map<string, Counts>,
  keyOf: (v: VacancyAttrs) => string | null,
  labels: Record<string, string> | ((key: string) => string),
  limit?: number,
): SliceRow[] {
  const acc = new Map<string, { vacancies: number; views: number; apply: number }>();
  for (const v of vacancies) {
    const key = keyOf(v);
    if (!key) continue;
    const cur = acc.get(key) ?? { vacancies: 0, views: 0, apply: 0 };
    const c = counts.get(v.slug);
    cur.vacancies += 1;
    cur.views += c?.views ?? 0;
    cur.apply += c?.apply ?? 0;
    acc.set(key, cur);
  }
  const rows = [...acc.entries()]
    .map(([key, v]) => ({
      key,
      label: typeof labels === "function" ? labels(key) : (labels[key] ?? key),
      vacancies: v.vacancies,
      views: v.views,
      apply: v.apply,
      ctr: v.views ? (100 * v.apply) / v.views : null,
      viewsPerVacancy: v.vacancies ? v.views / v.vacancies : null,
    }))
    .sort((a, b) => b.views - a.views || b.vacancies - a.vacancies);
  return limit ? rows.slice(0, limit) : rows;
}

async function loadVacancyAttrs(): Promise<VacancyAttrs[]> {
  const sql = getSql();
  // employment_type и source читаем через to_jsonb: в старой схеме их нет,
  // а прямая ссылка на несуществующую колонку уронила бы запрос.
  const rows = (await sql`
    select slug, title, company, sphere, exp, format, city, skills,
           salary_min, salary_max, published_at,
           coalesce(to_jsonb(v) ->> 'employment_type', to_jsonb(v) ->> 'type') as employment_type,
           to_jsonb(v) ->> 'source' as source
    from public.vacancies v
    where is_published = true and coalesce(is_archived, false) = false
  `) as Record<string, unknown>[];

  return rows.map((r) => ({
    slug: String(r.slug),
    title: String(r.title ?? ""),
    company: String(r.company ?? ""),
    direction: directionFromVacancy({
      sphere: r.sphere as string | null,
      title: r.title as string | null,
      skills: r.skills as string[] | null,
    }),
    employmentType: (r.employment_type as string | null) ?? null,
    exp: (r.exp as string | null) ?? null,
    format: (r.format as string | null) ?? null,
    city: (r.city as string | null) ?? null,
    salaryMin: r.salary_min == null ? null : Number(r.salary_min),
    salaryMax: r.salary_max == null ? null : Number(r.salary_max),
    source: (r.source as string | null) ?? null,
    publishedAt: r.published_at ? String(r.published_at) : null,
  }));
}

/**
 * Счётчики по вакансиям: сначала события за период, если их нет - накопительные
 * vacancy_stats. Второй источник без времени и без отсечения ботов, поэтому в
 * интерфейсе рядом стоит оговорка.
 */
async function loadVacancyCounts(days: Period): Promise<{ counts: Map<string, Counts>; hasEvents: boolean }> {
  const sql = getSql();
  const eventRows = (await sql`
    select entity_id as slug,
           count(*) filter (where event = 'vacancy_view')::int        as views,
           count(*) filter (where event = 'vacancy_apply_click')::int as apply
    from public.analytics_events
    where created_at >= now() - make_interval(days => ${days})
      and entity_type = 'vacancy'
      and entity_id is not null
    group by 1
  `) as { slug: string; views: number; apply: number }[];

  const counts = new Map<string, Counts>();
  let total = 0;
  for (const r of eventRows) {
    counts.set(r.slug, { views: r.views, apply: r.apply });
    total += r.views;
  }
  if (total > 0) return { counts, hasEvents: true };

  const legacy = (await sql`
    select vacancy_slug, views, apply_clicks from public.vacancy_stats
  `) as { vacancy_slug: string; views: number | string; apply_clicks: number | string }[];
  const fallback = new Map<string, Counts>();
  for (const r of legacy) {
    fallback.set(r.vacancy_slug, {
      views: Number(r.views) || 0,
      apply: Number(r.apply_clicks) || 0,
    });
  }
  return { counts: fallback, hasEvents: false };
}

export async function getVacanciesReport(days: Period): Promise<VacanciesReport> {
  const [vacancies, { counts, hasEvents }] = await Promise.all([
    loadVacancyAttrs(),
    loadVacancyCounts(days),
  ]);

  const withCounts = vacancies.map((v) => ({
    v,
    c: counts.get(v.slug) ?? { views: 0, apply: 0 },
  }));

  const ranked = withCounts
    .map(({ v, c }) => ({
      slug: v.slug,
      title: v.title,
      company: v.company,
      views: c.views,
      apply: c.apply,
      ctr: c.views ? (100 * c.apply) / c.views : null,
    }))
    .sort((a, b) => b.views - a.views);

  const medianViews = (() => {
    const vals = ranked.map((r) => r.views).sort((a, b) => a - b);
    return vals.length ? vals[Math.floor(vals.length / 2)] : 0;
  })();

  return {
    hasEvents,
    byEmploymentType: buildSlice(vacancies, counts, (v) => v.employmentType, EMPLOYMENT_LABELS),
    byExp: buildSlice(vacancies, counts, (v) => v.exp, EXP_LABELS_LOCAL),
    byFormat: buildSlice(vacancies, counts, (v) => v.format, FORMAT_LABELS_LOCAL),
    byCity: buildSlice(vacancies, counts, (v) => v.city?.trim() || null, (k) => k, 12),
    bySalary: buildSlice(vacancies, counts, salaryBucket, SALARY_LABELS),
    bySource: buildSlice(vacancies, counts, (v) => v.source, SOURCE_LABELS),
    byCompany: buildSlice(vacancies, counts, (v) => v.company?.trim() || null, (k) => k, 15),
    byAge: buildSlice(vacancies, counts, (v) => ageBucket(v.publishedAt), AGE_LABELS),
    top: ranked.slice(0, 20),
    worstCtr: ranked
      .filter((r) => r.views >= Math.max(5, medianViews))
      .sort((a, b) => (a.ctr ?? 0) - (b.ctr ?? 0))
      .slice(0, 10),
    deadStock: withCounts
      .filter(({ c }) => c.views === 0)
      .map(({ v }) => ({
        slug: v.slug,
        title: v.title,
        company: v.company,
        ageDays: v.publishedAt
          ? Math.round((Date.now() - new Date(v.publishedAt).getTime()) / 86_400_000)
          : -1,
      }))
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, 15),
  };
}

/* -------------------------------------------------------------------------- */
/* Пользователи и удержание                                                    */
/* -------------------------------------------------------------------------- */

export type UsersReport = {
  registrationsByWeek: { week: string; count: number }[];
  registrationsByMonth: { month: string; count: number }[];
  totalAccounts: number;
  activation: { step: string; count: number; share: number }[];
  /** Когорты по неделе регистрации: сколько вернулось на N-й неделе. */
  cohorts: { cohort: string; size: number; weeks: (number | null)[] }[];
  cohortDepth: number;
  /** Исторический суррогат: когда аккаунт в последний раз оставил след в БД. */
  lastSeen: { bucket: string; count: number; share: number }[];
  byDirection: { direction: string; label: string; count: number }[];
  byLevel: { level: string; count: number }[];
};

const LAST_SEEN_LABELS: Record<string, string> = {
  d7: "Были активны за 7 дней",
  d30: "8-30 дней назад",
  d90: "31-90 дней назад",
  older: "Больше 90 дней назад",
  never: "Ни одного действия после регистрации",
};

export async function getUsersReport(days: Period): Promise<UsersReport> {
  const sql = getSql();

  const registrationsByWeek = (await sql`
    select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week, count(*)::int as count
    from public.careerlab_accounts
    where created_at >= now() - make_interval(days => ${Math.max(days, 90)})
    group by 1 order by 1
  `) as { week: string; count: number }[];

  const registrationsByMonth = (await sql`
    select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*)::int as count
    from public.careerlab_accounts
    group by 1 order by 1
  `) as { month: string; count: number }[];

  const [totals] = (await sql`
    select
      count(*)::int as total,
      count(*) filter (where exists (
        select 1 from public.user_profiles p
        where p.account_id = a.id and coalesce(p.direction, '') <> ''
      ))::int as with_profile,
      count(*) filter (where exists (
        select 1 from public.user_resume_analyses r where r.account_id = a.id
      ))::int as with_resume,
      count(*) filter (where exists (
        select 1 from public.user_saved_vacancies s where s.account_id = a.id
      ))::int as with_saved,
      count(*) filter (where exists (
        select 1 from public.applications ap where ap.account_id = a.id
      ))::int as with_application,
      count(*) filter (where a.email_verified)::int as verified
    from public.careerlab_accounts a
  `) as {
    total: number;
    with_profile: number;
    with_resume: number;
    with_saved: number;
    with_application: number;
    verified: number;
  }[];

  const total = totals?.total ?? 0;
  const share = (n: number) => (total ? (100 * n) / total : 0);
  const activation = [
    { step: "Зарегистрированы", count: total, share: 100 },
    { step: "Подтвердили email", count: totals?.verified ?? 0, share: share(totals?.verified ?? 0) },
    { step: "Заполнили профиль", count: totals?.with_profile ?? 0, share: share(totals?.with_profile ?? 0) },
    { step: "Сохранили вакансию", count: totals?.with_saved ?? 0, share: share(totals?.with_saved ?? 0) },
    { step: "Прогнали резюме", count: totals?.with_resume ?? 0, share: share(totals?.with_resume ?? 0) },
    { step: "Отправили отклик", count: totals?.with_application ?? 0, share: share(totals?.with_application ?? 0) },
  ];

  // Когорты считаются по событиям, а события пишутся с 30 августа 2026:
  // до накопления истории таблица будет почти пустой, и это ожидаемо.
  const cohortDepth = 5;
  const cohortRows = (await sql`
    with cohorts as (
      select id, date_trunc('week', created_at)::date as cohort
      from public.careerlab_accounts
      where created_at >= now() - interval '10 weeks'
    ),
    activity as (
      select distinct account_id, date_trunc('week', created_at)::date as week
      from public.analytics_events
      where account_id is not null
    )
    select to_char(c.cohort, 'YYYY-MM-DD') as cohort,
           count(distinct c.id)::int as size,
           ((a.week - c.cohort) / 7)::int as week_index,
           count(distinct a.account_id)::int as active
    from cohorts c
    left join activity a on a.account_id = c.id and a.week >= c.cohort
    group by 1, 3
    order by 1
  `) as { cohort: string; size: number; week_index: number | null; active: number }[];

  const cohortMap = new Map<string, { size: number; weeks: (number | null)[] }>();
  for (const row of cohortRows) {
    const entry = cohortMap.get(row.cohort) ?? {
      size: 0,
      weeks: Array<number | null>(cohortDepth).fill(null),
    };
    entry.size = Math.max(entry.size, row.size);
    if (row.week_index !== null && row.week_index >= 0 && row.week_index < cohortDepth) {
      entry.weeks[row.week_index] = row.active;
    }
    cohortMap.set(row.cohort, entry);
  }

  const lastSeenRows = (await sql`
    with seen as (
      select a.id, a.created_at,
        greatest(
          a.created_at,
          coalesce((select max(p.updated_at) from public.user_profiles p where p.account_id = a.id), a.created_at),
          coalesce((select max(c.updated_at) from public.user_checklist_progress c where c.account_id = a.id), a.created_at),
          coalesce((select max(r.created_at) from public.user_resume_analyses r where r.account_id = a.id), a.created_at),
          coalesce((select max(ap.created_at) from public.applications ap where ap.account_id = a.id), a.created_at),
          coalesce((select max(e.created_at) from public.analytics_events e where e.account_id = a.id), a.created_at)
        ) as last_seen
      from public.careerlab_accounts a
    )
    select case
        when last_seen = created_at then 'never'
        when last_seen >= now() - interval '7 days' then 'd7'
        when last_seen >= now() - interval '30 days' then 'd30'
        when last_seen >= now() - interval '90 days' then 'd90'
        else 'older'
      end as bucket,
      count(*)::int as count
    from seen group by 1
  `) as { bucket: string; count: number }[];

  const profileRows = (await sql`
    select direction, level, count(*)::int as n
    from public.user_profiles
    where coalesce(direction, '') <> ''
    group by 1, 2
  `) as { direction: string; level: string; n: number }[];

  const dirAcc = new Map<string, number>();
  const levelAcc = new Map<string, number>();
  for (const row of profileRows) {
    const key = directionFromProfile(row.direction) ?? "other";
    dirAcc.set(key, (dirAcc.get(key) ?? 0) + row.n);
    const lvl = row.level?.trim() || "Не указан";
    levelAcc.set(lvl, (levelAcc.get(lvl) ?? 0) + row.n);
  }

  return {
    registrationsByWeek,
    registrationsByMonth,
    totalAccounts: total,
    activation,
    cohorts: [...cohortMap.entries()]
      .map(([cohort, v]) => ({ cohort, size: v.size, weeks: v.weeks }))
      .sort((a, b) => b.cohort.localeCompare(a.cohort)),
    cohortDepth,
    lastSeen: lastSeenRows
      .map((r) => ({
        bucket: LAST_SEEN_LABELS[r.bucket] ?? r.bucket,
        count: r.count,
        share: share(r.count),
      }))
      .sort((a, b) => b.count - a.count),
    byDirection: [...dirAcc.entries()]
      .map(([direction, count]) => ({
        direction,
        label: isDirection(direction) ? DIRECTION_LABELS[direction] : "Другое",
        count,
      }))
      .sort((a, b) => b.count - a.count),
    byLevel: [...levelAcc.entries()]
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/* -------------------------------------------------------------------------- */
/* Инструменты и поиск                                                         */
/* -------------------------------------------------------------------------- */

export type ToolsReport = {
  resume: {
    starts: number;
    finishes: number;
    completion: number | null;
    avgScore: number | null;
    scoreBuckets: { bucket: string; count: number }[];
    savedToDb: number;
    savedToDbAllTime: number;
  };
  calculator: {
    uses: number;
    byDirection: { label: string; count: number }[];
    byLevel: { level: string; count: number }[];
    byCity: { city: string; count: number }[];
  };
  search: {
    total: number;
    zeroResult: number;
    zeroShare: number | null;
    fuzzyUsed: number;
    topQueries: { q: string; n: number; minResults: number }[];
    zeroQueries: { q: string; n: number }[];
    filterUsage: { filter: string; used: number; share: number }[];
    topFilterValues: { filter: string; value: string; n: number }[];
  };
};

const SCORE_BUCKETS = [
  { key: "lt45", label: "До 45 - слабое резюме" },
  { key: "45-70", label: "45-70 - среднее" },
  { key: "gte70", label: "70+ - сильное" },
];

const FILTER_LABELS: Record<string, string> = {
  sphere: "Сфера",
  exp: "Опыт",
  type: "Тип занятости",
  format: "Формат",
  city: "Город",
};

export async function getToolsReport(days: Period): Promise<ToolsReport> {
  const sql = getSql();

  const toolRows = (await sql`
    select entity_id, event, props
    from public.analytics_events
    where created_at >= now() - make_interval(days => ${days})
      and entity_type = 'tool'
  `) as { entity_id: string; event: string; props: Record<string, unknown> | null }[];

  let starts = 0;
  let finishes = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  const scoreAcc = new Map<string, number>();
  let calcUses = 0;
  const calcDirection = new Map<string, number>();
  const calcLevel = new Map<string, number>();
  const calcCity = new Map<string, number>();

  for (const row of toolRows) {
    if (row.entity_id === "resume_analyzer") {
      if (row.event === "tool_start") starts += 1;
      if (row.event === "tool_finish") {
        finishes += 1;
        const score = Number(row.props?.score);
        if (Number.isFinite(score)) {
          scoreSum += score;
          scoreCount += 1;
          const key = score < 45 ? "lt45" : score < 70 ? "45-70" : "gte70";
          scoreAcc.set(key, (scoreAcc.get(key) ?? 0) + 1);
        }
      }
    }
    if (row.entity_id === "salary_calculator" && row.event === "tool_finish") {
      calcUses += 1;
      const city = String(row.props?.city ?? "");
      if (city) calcCity.set(city, (calcCity.get(city) ?? 0) + 1);
    }
  }

  const calcDims = (await sql`
    select coalesce(direction, 'unknown') as direction, coalesce(level, 'unknown') as level, count(*)::int as n
    from public.analytics_events
    where created_at >= now() - make_interval(days => ${days})
      and entity_id = 'salary_calculator' and event = 'tool_finish'
    group by 1, 2
  `) as { direction: string; level: string; n: number }[];
  for (const row of calcDims) {
    const label = isDirection(row.direction) ? DIRECTION_LABELS[row.direction] : "Не определено";
    calcDirection.set(label, (calcDirection.get(label) ?? 0) + row.n);
    calcLevel.set(row.level, (calcLevel.get(row.level) ?? 0) + row.n);
  }

  const [resumeDb] = (await sql`
    select
      count(*) filter (where created_at >= now() - make_interval(days => ${days}))::int as period,
      count(*)::int as all_time
    from public.user_resume_analyses
  `) as { period: number; all_time: number }[];

  const [searchTotals] = (await sql`
    select count(*)::int as total,
           count(*) filter (where results_count = 0)::int as zero,
           count(*) filter (where fuzzy_used)::int as fuzzy
    from public.search_queries
    where created_at >= now() - make_interval(days => ${days})
  `) as { total: number; zero: number; fuzzy: number }[];

  const topQueries = (await sql`
    select lower(q) as q, count(*)::int as n, min(results_count)::int as min_results
    from public.search_queries
    where created_at >= now() - make_interval(days => ${days})
    group by 1 order by n desc, q limit 25
  `) as { q: string; n: number; min_results: number }[];

  const zeroQueries = (await sql`
    select lower(q) as q, count(*)::int as n
    from public.search_queries
    where created_at >= now() - make_interval(days => ${days}) and results_count = 0
    group by 1 order by n desc, q limit 25
  `) as { q: string; n: number }[];

  const [filterCounts] = (await sql`
    select
      count(*)::int as total,
      count(*) filter (where jsonb_array_length(filters->'sphere') > 0)::int as sphere,
      count(*) filter (where jsonb_array_length(filters->'exp') > 0)::int as exp,
      count(*) filter (where jsonb_array_length(filters->'type') > 0)::int as type,
      count(*) filter (where jsonb_array_length(filters->'format') > 0)::int as format,
      count(*) filter (where jsonb_array_length(filters->'city') > 0)::int as city
    from public.search_queries
    where created_at >= now() - make_interval(days => ${days})
      and jsonb_typeof(filters->'sphere') = 'array'
  `) as Record<string, number>[];

  const filterValues = (await sql`
    select f.key as filter, value as value, count(*)::int as n
    from public.search_queries q
    cross join lateral (values ('sphere'), ('exp'), ('type'), ('format'), ('city')) as f(key)
    cross join lateral jsonb_array_elements_text(
      case when jsonb_typeof(q.filters -> f.key) = 'array' then q.filters -> f.key else '[]'::jsonb end
    ) as value
    where q.created_at >= now() - make_interval(days => ${days})
    group by 1, 2
    order by n desc
    limit 20
  `) as { filter: string; value: string; n: number }[];

  const searchTotal = searchTotals?.total ?? 0;
  const filterTotal = filterCounts?.total ?? 0;

  return {
    resume: {
      starts,
      finishes,
      completion: starts ? (100 * finishes) / starts : null,
      avgScore: scoreCount ? scoreSum / scoreCount : null,
      scoreBuckets: SCORE_BUCKETS.map((b) => ({ bucket: b.label, count: scoreAcc.get(b.key) ?? 0 })),
      savedToDb: resumeDb?.period ?? 0,
      savedToDbAllTime: resumeDb?.all_time ?? 0,
    },
    calculator: {
      uses: calcUses,
      byDirection: [...calcDirection.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      byLevel: [...calcLevel.entries()]
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => b.count - a.count),
      byCity: [...calcCity.entries()]
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count),
    },
    search: {
      total: searchTotal,
      zeroResult: searchTotals?.zero ?? 0,
      zeroShare: searchTotal ? (100 * (searchTotals?.zero ?? 0)) / searchTotal : null,
      fuzzyUsed: searchTotals?.fuzzy ?? 0,
      topQueries: topQueries.map((r) => ({ q: r.q, n: r.n, minResults: r.min_results })),
      zeroQueries,
      filterUsage: ["sphere", "exp", "type", "format", "city"].map((key) => ({
        filter: FILTER_LABELS[key] ?? key,
        used: filterCounts?.[key] ?? 0,
        share: filterTotal ? (100 * (filterCounts?.[key] ?? 0)) / filterTotal : 0,
      })).sort((a, b) => b.used - a.used),
      topFilterValues: filterValues.map((r) => ({
        filter: FILTER_LABELS[r.filter] ?? r.filter,
        value: r.value,
        n: r.n,
      })),
    },
  };
}
