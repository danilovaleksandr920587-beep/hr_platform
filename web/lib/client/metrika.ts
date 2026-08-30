"use client";

/**
 * Номер счётчика и цели Яндекс.Метрики.
 *
 * Цели дублируют события внутренней аналитики один в один по имени: в своей
 * таблице удобны разрезы по сущностям, в Метрике - источники трафика и
 * вебвизор по тем же действиям. Имена целей в интерфейсе Метрики должны
 * совпадать с именами событий из lib/analytics/events.ts.
 */
export const METRIKA_ID = 108774421;

type YmFn = (id: number, action: string, ...rest: unknown[]) => void;

export function ymGoal(goal: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !goal) return;
  try {
    const ym = (window as unknown as { ym?: YmFn }).ym;
    if (!ym) return;
    if (params) ym(METRIKA_ID, "reachGoal", goal, params);
    else ym(METRIKA_ID, "reachGoal", goal);
  } catch {
    // счётчик мог не загрузиться - это не повод ломать обработчик клика
  }
}
