import "server-only";
import { getSql } from "@/lib/db/postgres";

export type SearchLogEntry = {
  q: string;
  resultsCount: number;
  mentionsCount: number;
  fuzzyUsed: boolean;
  filters: Record<string, unknown>;
};

/**
 * Пишет запрос в `search_queries` (миграция 20260809120100_search_queries).
 *
 * Зачем: улучшать поиск вслепую нельзя. Главный отчёт - запросы с нулём
 * результатов: это готовый список дыр в словаре алиасов (lib/search/query.ts).
 *
 * Вызывать из after() - лог не должен задерживать ответ. Любая ошибка
 * проглатывается: упавший лог не повод ронять страницу выдачи.
 */
export async function logSearchQuery(entry: SearchLogEntry): Promise<void> {
  const q = entry.q.trim();
  if (!q || !process.env.DATABASE_URL?.trim()) return;

  try {
    const sql = getSql();
    await sql`
      insert into public.search_queries
        (q, results_count, mentions_count, fuzzy_used, filters)
      values (
        ${q.slice(0, 200)},
        ${entry.resultsCount},
        ${entry.mentionsCount},
        ${entry.fuzzyUsed},
        ${sql.json(entry.filters as never)}
      )
    `;
  } catch (err) {
    console.error(
      "logSearchQuery",
      err instanceof Error ? err.message : String(err),
    );
  }
}
