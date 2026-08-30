/**
 * Канонический справочник направлений.
 *
 * Зачем: одно и то же направление в проекте называется тремя разными способами -
 *   vacancies.sphere        13 ключей (lib/vacancy-labels.ts)
 *   user_profiles.direction 7 русских меток (селект в кабинете)
 *   калькулятор ЗП          13 своих ключей (lib/data/salary.ts)
 * Пока их не свести к одному, любой отчёт «по направлениям» складывает разное.
 * Этот файл - единственное место, где живёт канон и мапперы к нему.
 *
 * Канон взят от sphere (он самый широкий), плюс QA вынесен отдельным
 * направлением: в вакансиях он спрятан внутри sphere='it', а спрос на него
 * отдельный и его надо видеть.
 */

export const DIRECTIONS = [
  "it",
  "qa",
  "analytics",
  "design",
  "product",
  "marketing",
  "devops",
  "finance",
  "sales",
  "support",
  "hr",
  "operations",
  "security",
  "legal",
] as const;

export type DirectionKey = (typeof DIRECTIONS)[number];

export const DIRECTION_LABELS: Record<DirectionKey, string> = {
  it: "Разработка",
  qa: "QA / Тестирование",
  analytics: "Аналитика и данные",
  design: "Дизайн",
  product: "Продукт и управление",
  marketing: "Маркетинг",
  devops: "DevOps",
  finance: "Финансы",
  sales: "Продажи",
  support: "Поддержка",
  hr: "HR",
  operations: "Операции",
  security: "Безопасность",
  legal: "Юридическое",
};

const DIRECTION_SET = new Set<string>(DIRECTIONS);

export function isDirection(value: unknown): value is DirectionKey {
  return typeof value === "string" && DIRECTION_SET.has(value);
}

export function directionLabel(key: string | null | undefined): string {
  return isDirection(key) ? DIRECTION_LABELS[key] : "Не определено";
}

/* -------------------------------------------------------------------------- */
/* Уровни                                                                      */
/* -------------------------------------------------------------------------- */

export const LEVELS = ["intern", "junior", "middle", "senior"] as const;
export type LevelKey = (typeof LEVELS)[number];

export const LEVEL_KEY_LABELS: Record<LevelKey, string> = {
  intern: "Стажёр",
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
};

/** vacancies.exp -> канон уровня. */
const EXP_TO_LEVEL: Record<string, LevelKey> = {
  none: "intern",
  lt1: "junior",
  "1-3": "middle",
  gte3: "senior",
};

/** Уровень из анкеты кабинета (русская метка). */
const PROFILE_LEVEL_TO_LEVEL: Record<string, LevelKey> = {
  "Стажёр": "intern",
  Стажер: "intern",
  Junior: "junior",
  Middle: "middle",
  Senior: "senior",
};

export function levelFromExp(exp: string | null | undefined): LevelKey | null {
  if (!exp) return null;
  return EXP_TO_LEVEL[exp] ?? null;
}

export function levelFromProfile(level: string | null | undefined): LevelKey | null {
  if (!level) return null;
  return PROFILE_LEVEL_TO_LEVEL[level.trim()] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Мапперы в канон                                                             */
/* -------------------------------------------------------------------------- */

/** vacancies.sphere -> канон. Совпадает один в один, кроме отсутствующего qa. */
const SPHERE_TO_DIRECTION: Record<string, DirectionKey> = {
  it: "it",
  design: "design",
  marketing: "marketing",
  analytics: "analytics",
  product: "product",
  sales: "sales",
  support: "support",
  hr: "hr",
  finance: "finance",
  operations: "operations",
  security: "security",
  devops: "devops",
  legal: "legal",
};

/** user_profiles.direction (русская метка из селекта) -> канон. */
const PROFILE_TO_DIRECTION: Record<string, DirectionKey> = {
  IT: "it",
  QA: "qa",
  Аналитика: "analytics",
  Дизайн: "design",
  Маркетинг: "marketing",
  Управление: "product",
  Финансы: "finance",
};

/**
 * Ключ направления калькулятора ЗП -> канон.
 * Аналитические роли (включая системного и бизнес-аналитика и Data Engineering)
 * сводятся в analytics: на этой платформе они один сегмент спроса.
 */
const SALARY_TO_DIRECTION: Record<string, DirectionKey> = {
  analyst: "analytics",
  dataeng: "analytics",
  sysanalyst: "analytics",
  bizanalyst: "analytics",
  backend: "it",
  frontend: "it",
  qa: "qa",
  devops: "devops",
  pm: "product",
  marketing: "marketing",
  design: "design",
  hr: "hr",
  finance: "finance",
};

export function directionFromSphere(sphere: string | null | undefined): DirectionKey | null {
  if (!sphere) return null;
  return SPHERE_TO_DIRECTION[sphere.trim().toLowerCase()] ?? null;
}

export function directionFromProfile(direction: string | null | undefined): DirectionKey | null {
  if (!direction) return null;
  return PROFILE_TO_DIRECTION[direction.trim()] ?? null;
}

export function directionFromSalaryKey(key: string | null | undefined): DirectionKey | null {
  if (!key) return null;
  return SALARY_TO_DIRECTION[key.trim().toLowerCase()] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Уточнение по тексту                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Ключевые слова, по которым направление узнаётся в свободном тексте
 * (название вакансии, поисковый запрос). Порядок важен: первое совпадение
 * выигрывает, поэтому более узкие направления идут выше более широких.
 *
 * Словарь намеренно короткий и без двусмысленных токенов (go, ds, ui) - те же
 * грабли, что и в lib/search/query.ts: мусора они дают больше, чем находок.
 */
const TEXT_RULES: { direction: DirectionKey; words: string[] }[] = [
  { direction: "qa", words: ["qa", "тестировщик", "тестирование", "автотест", "quality assurance", "sdet"] },
  { direction: "devops", words: ["devops", "девопс", "sre", "инфраструктур"] },
  { direction: "security", words: ["security", "безопасн", "пентест", "инфобез", "soc-аналитик"] },
  { direction: "analytics", words: ["аналитик", "analyst", "аналитика", "data scientist", "дата-сайентист", "data engineer", "дата-инженер", "bi-", "машинное обучение"] },
  { direction: "design", words: ["дизайн", "design", "ux", "ux/ui", "иллюстратор", "моушн"] },
  { direction: "product", words: ["продакт", "проджект", "product manager", "project manager", "менеджер проектов", "продуктовый менеджер"] },
  { direction: "marketing", words: ["маркетинг", "маркетолог", "marketing", "smm", "seo", "контент-менеджер", "таргетолог"] },
  { direction: "hr", words: ["hr", "рекрутер", "recruiter", "эйчар", "подбор персонала"] },
  { direction: "sales", words: ["продаж", "sales", "менеджер по продажам", "аккаунт-менеджер"] },
  { direction: "support", words: ["поддержк", "support", "техподдержка", "оператор"] },
  { direction: "finance", words: ["финанс", "бухгалтер", "аудит", "казначей"] },
  { direction: "legal", words: ["юрист", "юридическ", "legal", "комплаенс"] },
  { direction: "it", words: ["разработчик", "программист", "developer", "frontend", "backend", "фронтенд", "бэкенд", "фулстек", "fullstack", "python", "java", "javascript", "golang", "c++", "1с-разработчик", "android", "ios", "mobile"] },
];

/** Первое совпадение по словарю TEXT_RULES. */
export function directionFromText(text: string | null | undefined): DirectionKey | null {
  if (!text) return null;
  const haystack = text.toLowerCase();
  for (const rule of TEXT_RULES) {
    for (const word of rule.words) {
      if (haystack.includes(word)) return rule.direction;
    }
  }
  return null;
}

/**
 * Направление вакансии.
 *
 * sphere - основа, но внутри sphere='it' сидят QA и DevOps: у них нет своего
 * значения в constraint таблицы. Поэтому для 'it' сначала пробуем узнать роль
 * по названию и стеку, и только потом падаем обратно на sphere.
 */
export function directionFromVacancy(v: {
  sphere?: string | null;
  title?: string | null;
  skills?: string[] | null;
}): DirectionKey | null {
  const bySphere = directionFromSphere(v.sphere);
  if (bySphere === "it") {
    const text = [v.title, ...(v.skills ?? [])].filter(Boolean).join(" ");
    const refined = directionFromText(text);
    if (refined === "qa" || refined === "devops" || refined === "security") return refined;
    return "it";
  }
  return bySphere;
}

/** Направление поискового запроса (для отчёта по спросу). */
export function directionFromSearchQuery(q: string | null | undefined): DirectionKey | null {
  return directionFromText(q);
}
