// Единый источник зарплатных данных CareerLab.
// Используется калькулятором ЗП (/tools/salary-calculator) и карточкой
// "Зарплата по профилю" в личном кабинете (/office).
//
// Модель: для пары (направление, уровень) хранится ОДНА базовая медиана по
// Москве на дату калибровки SALARY_AS_OF. Всё остальное - производные:
//   медиана сегодня = база x (1 + годовой тренд)^(месяцев с калибровки / 12)
//   медиана города  = медиана x CITY_COEF[город]
//   вилка           = медиана x [SPREAD_LOW .. SPREAD_HIGH]
//   строки "как опыт влияет" = медиана x EXPERIENCE_MULTIPLIERS[уровень]
// Числа внутри файла - тыс ₽/мес до вычета НДФЛ.
//
// Обновление данных = поправить базовые медианы и SALARY_AS_OF.
// Между обновлениями цифры индексируются трендом автоматически и не протухают.

export type SalaryLevel = "intern" | "junior" | "middle" | "senior";
export type SalaryCity = "moscow" | "spb" | "million" | "regions" | "remote";

/** Дата калибровки базовых медиан (год-месяц). */
export const SALARY_AS_OF = "2026-07";

export const LEVEL_LABELS: Record<SalaryLevel, string> = {
  intern: "Стажёр",
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
};

export const CITY_LABELS: Record<SalaryCity, string> = {
  moscow: "Москва",
  spb: "Санкт-Петербург",
  million: "Города-миллионники",
  regions: "Другие регионы",
  remote: "Удалённо",
};

/** Коэффициент к московской медиане. */
export const CITY_COEF: Record<SalaryCity, number> = {
  moscow: 1,
  spb: 0.87,
  million: 0.76,
  regions: 0.65,
  remote: 0.92,
};

/** Вилка вокруг медианы: нижняя и верхняя границы рынка. */
const SPREAD_LOW = 0.75;
const SPREAD_HIGH = 1.3;

export type SalaryDirection = {
  key: string;
  /** Название в UI, например "Аналитика / Data". */
  name: string;
  /** Базовые медианы по Москве на SALARY_AS_OF, тыс ₽/мес. */
  base: Record<SalaryLevel, number>;
  /** Годовой рост рынка направления (0.15 = +15% в год). */
  trend: number;
  /** Навыки, двигающие оффер к верху вилки. */
  growthFactors: string[];
};

export const SALARY_DIRECTIONS: SalaryDirection[] = [
  {
    key: "analyst",
    name: "Аналитика / Data",
    base: { intern: 60, junior: 115, middle: 200, senior: 340 },
    trend: 0.16,
    growthFactors: ["SQL (обязателен)", "Python / pandas", "BI-инструменты", "A/B тесты"],
  },
  {
    key: "dataeng",
    name: "Data Engineering",
    base: { intern: 70, junior: 130, middle: 240, senior: 400 },
    trend: 0.17,
    growthFactors: ["SQL и оптимизация", "Airflow / ETL", "Spark", "облачные хранилища"],
  },
  {
    key: "backend",
    name: "Разработка / Backend",
    base: { intern: 72, junior: 125, middle: 240, senior: 400 },
    trend: 0.15,
    growthFactors: ["язык стека", "базы данных", "микросервисы", "DevOps-практики"],
  },
  {
    key: "frontend",
    name: "Разработка / Frontend",
    base: { intern: 65, junior: 115, middle: 220, senior: 370 },
    trend: 0.12,
    growthFactors: ["React/Vue", "TypeScript", "тестирование", "архитектура"],
  },
  {
    key: "qa",
    name: "QA / Тестирование",
    base: { intern: 55, junior: 95, middle: 175, senior: 290 },
    trend: 0.12,
    growthFactors: ["автотесты (Python/JS)", "API-тестирование", "CI/CD", "нагрузочное"],
  },
  {
    key: "devops",
    name: "DevOps / SRE",
    base: { intern: 75, junior: 140, middle: 260, senior: 430 },
    trend: 0.18,
    growthFactors: ["Kubernetes", "Terraform / IaC", "CI/CD", "мониторинг"],
  },
  {
    key: "sysanalyst",
    name: "Системный аналитик",
    base: { intern: 60, junior: 110, middle: 195, senior: 320 },
    trend: 0.14,
    growthFactors: ["UML / BPMN", "SQL", "REST / интеграции", "постановка ТЗ"],
  },
  {
    key: "bizanalyst",
    name: "Бизнес-аналитик",
    base: { intern: 55, junior: 100, middle: 180, senior: 300 },
    trend: 0.12,
    growthFactors: ["анализ процессов", "SQL", "Excel / BI", "юнит-экономика"],
  },
  {
    key: "pm",
    name: "Продакт / Проджект",
    base: { intern: 58, junior: 110, middle: 210, senior: 360 },
    trend: 0.16,
    growthFactors: ["метрики продукта", "SQL", "A/B тесты", "Jira/Notion"],
  },
  {
    key: "marketing",
    name: "Маркетинг / SMM / Growth",
    base: { intern: 40, junior: 80, middle: 145, senior: 260 },
    trend: 0.08,
    growthFactors: ["таргет ВК/TG", "аналитика", "контент-стратегия", "CJM"],
  },
  {
    key: "design",
    name: "Дизайн / UX/UI",
    base: { intern: 46, junior: 92, middle: 170, senior: 300 },
    trend: 0.1,
    growthFactors: ["Figma", "UX-исследования", "дизайн-система", "анимации"],
  },
  {
    key: "hr",
    name: "HR / Рекрутинг",
    base: { intern: 40, junior: 75, middle: 135, senior: 230 },
    trend: 0.08,
    growthFactors: ["IT-рекрутинг", "сорсинг", "HR-аналитика", "онбординг"],
  },
  {
    key: "finance",
    name: "Финансы / Аудит",
    base: { intern: 45, junior: 85, middle: 155, senior: 270 },
    trend: 0.09,
    growthFactors: ["Excel / финмодели", "МСФО", "SQL", "1С / ERP"],
  },
];

const DIRECTION_BY_KEY = new Map(SALARY_DIRECTIONS.map((d) => [d.key, d]));

export function getDirection(key: string): SalaryDirection {
  return DIRECTION_BY_KEY.get(key) ?? SALARY_DIRECTIONS[0];
}

/**
 * Строки таблицы "как опыт влияет на зарплату": множители к медиане
 * направления, а не абсолютные числа - таблица корректна для любого
 * направления (у маркетолога и бэкендера разные деньги за тот же опыт).
 */
export const EXPERIENCE_MULTIPLIERS: Record<SalaryLevel, Array<[string, number, number]>> = {
  intern: [
    ["Без доп. навыков", 0.6, 0.9],
    ["С базой SQL/Python", 0.85, 1.2],
    ["С портфолио", 0.95, 1.35],
    ["С релевантным пет-проектом", 1.05, 1.5],
  ],
  junior: [
    ["Нет коммерческого опыта", 0.6, 0.85],
    ["3-6 мес стажировки", 0.8, 1.1],
    ["6-12 мес опыта", 0.95, 1.35],
    ["1+ год + пет-проекты", 1.1, 1.6],
  ],
  middle: [
    ["2-3 года опыта", 0.7, 0.95],
    ["3-4 года + лидерство", 0.85, 1.15],
    ["4+ года + менторинг", 1.0, 1.35],
    ["Тех. лидерство", 1.15, 1.6],
  ],
  senior: [
    ["5-6 лет", 0.7, 0.95],
    ["7+ лет + архитектура", 0.9, 1.2],
    ["Тимлид", 1.05, 1.45],
    ["Principal/Staff", 1.25, 1.8],
  ],
};

function monthsSince(asOf: string, now: Date): number {
  const [y, m] = asOf.split("-").map(Number);
  return Math.max(0, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m));
}

/** Округление до 5 тыс - зарплатные цифры не должны выглядеть фальшиво точными. */
function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

/** Медиана направления на сегодня (Москва), тыс ₽: база + индексация трендом. */
export function indexedMedian(dirKey: string, level: SalaryLevel, now: Date = new Date()): number {
  const d = getDirection(dirKey);
  const months = monthsSince(SALARY_AS_OF, now);
  return d.base[level] * Math.pow(1 + d.trend, months / 12);
}

export type SalaryBand = { low: number; high: number; median: number };

/** Вилка и медиана для (направление, уровень, город) на сегодня, тыс ₽. */
export function salaryBand(
  dirKey: string,
  level: SalaryLevel,
  city: SalaryCity,
  now: Date = new Date(),
): SalaryBand {
  const median = indexedMedian(dirKey, level, now) * CITY_COEF[city];
  return {
    low: round5(median * SPREAD_LOW),
    high: round5(median * SPREAD_HIGH),
    median: round5(median),
  };
}

/** Таблица "как опыт влияет" для направления (Москва), тыс ₽. */
export function compareRows(
  dirKey: string,
  level: SalaryLevel,
  now: Date = new Date(),
): Array<[string, number, number]> {
  const median = indexedMedian(dirKey, level, now);
  return EXPERIENCE_MULTIPLIERS[level].map(([label, lo, hi]) => [
    label,
    round5(median * lo),
    round5(median * hi),
  ]);
}

/** Подпись тренда для UI: "+15% за год". */
export function trendLabel(dirKey: string): string {
  return `+${Math.round(getDirection(dirKey).trend * 100)}% за год`;
}

/** Подпись влияния города: "+0% (базовый рынок)" / "-13% к Москве". */
export function cityImpactLabel(city: SalaryCity): string {
  if (city === "moscow") return "+0% (базовый рынок)";
  return `${Math.round((CITY_COEF[city] - 1) * 100)}% к Москве`;
}

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

/** Бейдж актуальности: данные индексируются, поэтому показываем текущий месяц. */
export function salaryAsOfLabel(now: Date = new Date()): string {
  return `${MONTHS_RU[now.getMonth()]} ${now.getFullYear()}`;
}

// ── Маппинг направлений профиля из личного кабинета ─────────────────────────
// В профиле /office направления и уровни хранятся по-русски.

const PROFILE_DIRECTION_TO_KEY: Record<string, string> = {
  IT: "backend",
  Аналитика: "analyst",
  Финансы: "finance",
  Маркетинг: "marketing",
  Управление: "pm",
  Дизайн: "design",
  QA: "qa",
};

const PROFILE_LEVEL_TO_KEY: Record<string, SalaryLevel> = {
  Стажёр: "intern",
  Junior: "junior",
  Middle: "middle",
  Senior: "senior",
};

/** Вилка для профиля из ЛК, в РУБЛЯХ (карточка в /office работает в рублях). */
export function getSalaryForProfile(
  direction: string,
  level: string,
  now: Date = new Date(),
): { min: number; max: number; median: number } {
  const dirKey = PROFILE_DIRECTION_TO_KEY[direction] ?? "backend";
  const levelKey = PROFILE_LEVEL_TO_KEY[level] ?? "junior";
  const band = salaryBand(dirKey, levelKey, "moscow", now);
  return { min: band.low * 1000, max: band.high * 1000, median: band.median * 1000 };
}
