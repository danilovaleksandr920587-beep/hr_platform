export type KnowledgeCluster = {
  slug: "resume" | "interview" | "test" | "salary" | "apply" | "career";
  category:
    | "Резюме"
    | "Собеседование"
    | "Тестовые"
    | "Зарплата"
    | "Отклики"
    | "Карьера и рост";
  priority: 1 | 2 | 3;
  title: string;
  description: string;
};

export const KNOWLEDGE_CLUSTERS: KnowledgeCluster[] = [
  {
    slug: "resume",
    category: "Резюме",
    title: "Хаб: резюме для стажировки и первой работы",
    description:
      "Шаблоны, ATS-подсказки и структура сильного резюме для студентов и джунов.",
    priority: 1,
  },
  {
    slug: "interview",
    category: "Собеседование",
    title: "Хаб: подготовка к собеседованию",
    description:
      "Вопросы, стратегии ответов и чеклисты для уверенного прохождения интервью.",
    priority: 2,
  },
  {
    slug: "test",
    category: "Тестовые",
    title: "Хаб: тестовые задания и live coding",
    description:
      "Как оценивать сроки, показывать уровень и не выгорать на тестовых задачах.",
    priority: 3,
  },
  {
    slug: "salary",
    category: "Зарплата",
    title: "Хаб: переговоры по зарплате и офферу",
    description:
      "Диапазоны, аргументация и разбор оффера: как обсуждать компенсацию без стресса.",
    priority: 2,
  },
  {
    slug: "apply",
    category: "Отклики",
    title: "Хаб: отклики и сопроводительные письма",
    description:
      "Как писать сильные отклики и сопроводительные письма, чтобы получать больше ответов.",
    priority: 2,
  },
  {
    slug: "career",
    category: "Карьера и рост",
    title: "Хаб: карьера и рост",
    description:
      "Стратегии развития после первого оффера: навыки, трек роста и карьерные решения.",
    priority: 2,
  },
];

export function clusterBySlug(slug: string): KnowledgeCluster | null {
  return KNOWLEDGE_CLUSTERS.find((x) => x.slug === slug) ?? null;
}

