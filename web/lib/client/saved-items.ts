export const SAVED_STORAGE_KEYS = {
  vacancies: "careerlab-saved-vacancies",
  kbSlugs: "careerlab-kb-saved-slugs",
  kbArticleLegacy: "careerlab-kb-article-saved",
} as const;

export const SAVED_ITEMS_EVENT = "careerlab:saved-items-updated";
/** Диспатчится, когда запись сохранёнки в БД у залогиненного пользователя не
 *  прошла и UI-состояние откатано. `SavedItemsToast` показывает уведомление. */
export const SAVED_ITEMS_ERROR = "careerlab:saved-items-error";

export type SavedItemsErrorDetail = {
  kind: "vacancy" | "article";
  slug: string;
  /** true - не удалось сохранить; false - не удалось убрать из сохранённого. */
  shouldSave: boolean;
};

export type SavedSnapshot = {
  vacancies: Set<string>;
  articles: Set<string>;
};

function normalizeScope(scope?: string | null): string {
  return (scope ?? "").trim().toLowerCase();
}

function safeParseArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeArray(key: string, values: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...values]));
}

function scopedKey(base: string, scope: string): string {
  return scope ? `${base}:${scope}` : base;
}

function migrateLegacyToScope(scope: string) {
  if (!scope) return;
  const marker = `careerlab-saved-migrated:${scope}`;
  if (localStorage.getItem(marker) === "1") return;

  const globalVacancies = new Set(
    safeParseArray(localStorage.getItem(SAVED_STORAGE_KEYS.vacancies)),
  );
  const globalArticles = new Set([
    ...safeParseArray(localStorage.getItem(SAVED_STORAGE_KEYS.kbSlugs)),
    ...safeParseArray(localStorage.getItem(SAVED_STORAGE_KEYS.kbArticleLegacy)),
  ]);

  writeArray(scopedKey(SAVED_STORAGE_KEYS.vacancies, scope), globalVacancies);
  writeArray(scopedKey(SAVED_STORAGE_KEYS.kbSlugs, scope), globalArticles);
  writeArray(scopedKey(SAVED_STORAGE_KEYS.kbArticleLegacy, scope), globalArticles);
  localStorage.setItem(marker, "1");
}

export function readSavedSnapshot(scope?: string | null): SavedSnapshot {
  if (typeof window === "undefined") {
    return { vacancies: new Set(), articles: new Set() };
  }

  const s = normalizeScope(scope);
  migrateLegacyToScope(s);

  const vacanciesKey = scopedKey(SAVED_STORAGE_KEYS.vacancies, s);
  const articleUnifiedKey = scopedKey(SAVED_STORAGE_KEYS.kbSlugs, s);
  const articleLegacyKey = scopedKey(SAVED_STORAGE_KEYS.kbArticleLegacy, s);

  const vacancies = new Set(safeParseArray(localStorage.getItem(vacanciesKey)));
  const articleUnified = new Set(safeParseArray(localStorage.getItem(articleUnifiedKey)));
  const articleLegacy = new Set(safeParseArray(localStorage.getItem(articleLegacyKey)));
  const articles = new Set([...articleUnified, ...articleLegacy]);

  writeArray(articleUnifiedKey, articles);
  writeArray(articleLegacyKey, articles);

  return { vacancies, articles };
}

export function isVacancySaved(slug: string, scope?: string | null): boolean {
  return readSavedSnapshot(scope).vacancies.has(slug);
}

export function isArticleSaved(slug: string, scope?: string | null): boolean {
  return readSavedSnapshot(scope).articles.has(slug);
}

function dispatchSavedError(detail: SavedItemsErrorDetail) {
  window.dispatchEvent(new CustomEvent(SAVED_ITEMS_ERROR, { detail }));
}

/**
 * Пишет операцию сохранёнки в БД с учётом статуса сессии (B-3):
 * - Гость (`scope === ""`) - сохранёнки живут только в localStorage; DB-запрос
 *   всё равно уходит (вернёт 401), ошибку глушим, UI не трогаем.
 * - Залогиненный - при неуспехе (5xx / истёкшая сессия / сеть) вызываем
 *   `rollback`, чтобы UI-состояние не разошлось с БД (иначе последующий
 *   `syncSavedFromDb` тихо затрёт «сохранёнку», которой в БД нет).
 */
function persistSaved(
  url: string,
  slug: string,
  shouldSave: boolean,
  scope: string,
  rollback: () => void,
) {
  const req = fetch(url, {
    method: shouldSave ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });

  if (scope === "") {
    // Гость: localStorage - единственный источник, откат не нужен.
    void req.catch(() => {});
    return;
  }

  void req
    .then((res) => {
      if (!res.ok) rollback();
    })
    .catch(() => rollback());
}

export function setVacancySaved(
  slug: string,
  shouldSave: boolean,
  scope?: string | null,
) {
  if (typeof window === "undefined") return;
  const s = normalizeScope(scope);
  const { vacancies } = readSavedSnapshot(s);
  if (shouldSave) vacancies.add(slug);
  else vacancies.delete(slug);
  writeArray(scopedKey(SAVED_STORAGE_KEYS.vacancies, s), vacancies);
  window.dispatchEvent(new CustomEvent(SAVED_ITEMS_EVENT));

  persistSaved("/api/saved-vacancies", slug, shouldSave, s, () => {
    // Откатываем только если оптимистичное изменение всё ещё в силе -
    // пользователь мог за это время переключить сердечко заново.
    const current = readSavedSnapshot(s).vacancies;
    if (current.has(slug) !== shouldSave) return;
    if (shouldSave) current.delete(slug);
    else current.add(slug);
    writeArray(scopedKey(SAVED_STORAGE_KEYS.vacancies, s), current);
    window.dispatchEvent(new CustomEvent(SAVED_ITEMS_EVENT));
    dispatchSavedError({ kind: "vacancy", slug, shouldSave });
  });
}

export function setArticleSaved(
  slug: string,
  shouldSave: boolean,
  scope?: string | null,
) {
  if (typeof window === "undefined") return;
  const s = normalizeScope(scope);
  const { articles } = readSavedSnapshot(s);
  if (shouldSave) articles.add(slug);
  else articles.delete(slug);
  writeArray(scopedKey(SAVED_STORAGE_KEYS.kbSlugs, s), articles);
  writeArray(scopedKey(SAVED_STORAGE_KEYS.kbArticleLegacy, s), articles);
  window.dispatchEvent(new CustomEvent(SAVED_ITEMS_EVENT));

  persistSaved("/api/saved-articles", slug, shouldSave, s, () => {
    const current = readSavedSnapshot(s).articles;
    if (current.has(slug) !== shouldSave) return;
    if (shouldSave) current.delete(slug);
    else current.add(slug);
    writeArray(scopedKey(SAVED_STORAGE_KEYS.kbSlugs, s), current);
    writeArray(scopedKey(SAVED_STORAGE_KEYS.kbArticleLegacy, s), current);
    window.dispatchEvent(new CustomEvent(SAVED_ITEMS_EVENT));
    dispatchSavedError({ kind: "article", slug, shouldSave });
  });
}

/**
 * Loads saved slugs from DB and writes them into localStorage, then fires
 * SAVED_ITEMS_EVENT so all components re-render. Call once per page load for
 * authenticated users (e.g. from OfficeDashboard or a layout component).
 */
export async function syncSavedFromDb(scope: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Only sync once per browser session to avoid redundant API calls
  const sessionKey = `careerlab-db-synced:${normalizeScope(scope)}`;
  if (sessionStorage.getItem(sessionKey) === "1") return;

  try {
    const [vacRes, artRes] = await Promise.all([
      fetch("/api/saved-vacancies"),
      fetch("/api/saved-articles"),
    ]);
    if (!vacRes.ok || !artRes.ok) return;

    const [vacData, artData] = await Promise.all([
      vacRes.json() as Promise<{ slugs?: string[] }>,
      artRes.json() as Promise<{ slugs?: string[] }>,
    ]);

    const s = normalizeScope(scope);
    const vacSlugs = new Set<string>(Array.isArray(vacData.slugs) ? vacData.slugs : []);
    const artSlugs = new Set<string>(Array.isArray(artData.slugs) ? artData.slugs : []);

    writeArray(scopedKey(SAVED_STORAGE_KEYS.vacancies, s), vacSlugs);
    writeArray(scopedKey(SAVED_STORAGE_KEYS.kbSlugs, s), artSlugs);
    writeArray(scopedKey(SAVED_STORAGE_KEYS.kbArticleLegacy, s), artSlugs);

    window.dispatchEvent(new CustomEvent(SAVED_ITEMS_EVENT));
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    // Non-critical — localStorage data remains as fallback
  }
}
