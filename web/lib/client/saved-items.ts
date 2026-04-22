export const SAVED_STORAGE_KEYS = {
  vacancies: "careerlab-saved-vacancies",
  kbSlugs: "careerlab-kb-saved-slugs",
  kbArticleLegacy: "careerlab-kb-article-saved",
} as const;

export const SAVED_ITEMS_EVENT = "careerlab:saved-items-updated";

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

  // Keep both old/new article keys synchronized while migrating.
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
}

