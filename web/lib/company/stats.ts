import "server-only";
import { getSql } from "@/lib/db/postgres";

export type VacancyStat = {
  vacancy_slug: string;
  views: number;
  apply_clicks: number;
};

type StatEvent = "view" | "apply";

/** Инкремент счётчика вакансии (upsert). Тихо игнорирует ошибки БД - метрика
 *  не должна ронять отдачу страницы вакансии. */
export async function incrementVacancyStat(
  slug: string,
  event: StatEvent,
): Promise<void> {
  if (!slug) return;
  const column = event === "apply" ? "apply_clicks" : "views";
  try {
    const sql = getSql();
    if (column === "apply_clicks") {
      await sql`
        insert into vacancy_stats (vacancy_slug, apply_clicks, updated_at)
        values (${slug}, 1, now())
        on conflict (vacancy_slug)
        do update set apply_clicks = vacancy_stats.apply_clicks + 1, updated_at = now()
      `;
    } else {
      await sql`
        insert into vacancy_stats (vacancy_slug, views, updated_at)
        values (${slug}, 1, now())
        on conflict (vacancy_slug)
        do update set views = vacancy_stats.views + 1, updated_at = now()
      `;
    }
  } catch (e) {
    console.error("incrementVacancyStat", e instanceof Error ? e.message : e);
  }
}

/** Статистика по набору slug-ов -> map slug -> {views, apply_clicks}. */
export async function getVacancyStats(
  slugs: string[],
): Promise<Map<string, VacancyStat>> {
  const clean = [...new Set(slugs.filter(Boolean))];
  if (!clean.length) return new Map();
  try {
    const sql = getSql();
    const rows = (await sql`
      select vacancy_slug, views, apply_clicks
      from vacancy_stats
      where vacancy_slug = any(${clean})
    `) as { vacancy_slug: string; views: number | string; apply_clicks: number | string }[];
    const map = new Map<string, VacancyStat>();
    for (const r of rows) {
      map.set(r.vacancy_slug, {
        vacancy_slug: r.vacancy_slug,
        views: Number(r.views),
        apply_clicks: Number(r.apply_clicks),
      });
    }
    return map;
  } catch (e) {
    console.error("getVacancyStats", e instanceof Error ? e.message : e);
    return new Map();
  }
}
