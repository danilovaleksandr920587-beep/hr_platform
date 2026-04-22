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

export function readSavedSnapshot(): SavedSnapshot {
  if (typeof window === "undefined") {
    return { vacancies: new Set(), articles: new Set() };
  }

  const vacancies = new Set(safeParseArray(localStorage.getItem(SAVED_STORAGE_KEYS.vacancies)));
  const articleUnified = new Set(safeParseArray(localStorage.getItem(SAVED_STORAGE_KEYS.kbSlugs)));
  const articleLegacy = new Set(safeParseArray(localStorage.getItem(SAVED_STORAGE_KEYS.kbArticleLegacy)));
  const articles = new Set([...articleUnified, ...articleLegacy]);

  // Keep both old/new article keys synchronized while migrating.
  writeArray(SAVED_STORAGE_KEYS.kbSlugs, articles);
  writeArray(SAVED_STORAGE_KEYS.kbArticleLegacy, articles);

  return { vacancies, articles };
}

export function isVacancySaved(slug: string): boolean {
  return readSavedSnapshot().vacancies.has(slug);
}

export function isArticleSaved(slug: string): boolean {
  return readSavedSnapshot().articles.has(slug);
}

export function setVacancySaved(slug: string, shouldSave: boolean) {
  if (typeof window === "undefined") return;
  const { vacancies } = readSavedSnapshot();
  if (shouldSave) vacancies.add(slug);
  else vacancies.delete(slug);
  writeArray(SAVED_STORAGE_KEYS.vacancies, vacancies);
  window.dispatchEvent(new CustomEvent(SAVED_ITEMS_EVENT));
}

export function setArticleSaved(slug: string, shouldSave: boolean) {
  if (typeof window === "undefined") return;
  const { articles } = readSavedSnapshot();
  if (shouldSave) articles.add(slug);
  else articles.delete(slug);
  writeArray(SAVED_STORAGE_KEYS.kbSlugs, articles);
  writeArray(SAVED_STORAGE_KEYS.kbArticleLegacy, articles);
  window.dispatchEvent(new CustomEvent(SAVED_ITEMS_EVENT));
}

