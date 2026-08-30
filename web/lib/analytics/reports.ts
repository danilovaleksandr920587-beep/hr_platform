import "server-only";
import { getSql } from "@/lib/db/postgres";
import {
  DIRECTIONS,
  directionFromProfile,
  directionFromSearchQuery,
  directionFromVacancy,
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
