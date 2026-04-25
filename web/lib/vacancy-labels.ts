export const SPHERE_LABELS: Record<string, string> = {
  it: "IT",
  design: "Дизайн",
  marketing: "Маркетинг",
  analytics: "Аналитика",
  product: "Продукт",
  sales: "Продажи",
  support: "Поддержка",
  hr: "HR",
  finance: "Финансы",
  operations: "Операции",
  security: "Безопасность",
  devops: "DevOps",
  legal: "Юридическое",
};

export const EXP_LABELS: Record<string, string> = {
  none: "Без опыта",
  lt1: "До 1 года",
  "1-3": "1–3 года",
  gte3: "От 3 лет",
};

export const FORMAT_LABELS: Record<string, string> = {
  remote: "Удалённо",
  hybrid: "Гибрид",
  office: "Офис",
};

export const TYPE_LABELS: Record<string, string> = {
  internship: "Стажировка",
  project: "Проектная работа",
  parttime: "Подработка",
};

export type FilterOption = { value: string; label: string; count?: number };

