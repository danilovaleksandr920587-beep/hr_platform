export type KnowledgeCluster = {
  slug: "resume" | "interview" | "test" | "salary";
  category: "Резюме" | "Собеседование" | "Тестовые" | "Зарплата";
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
  },
  {
    slug: "interview",
    category: "Собеседование",
    title: "Хаб: подготовка к собеседованию",
    description:
      "Вопросы, стратегии ответов и чеклисты для уверенного прохождения интервью.",
  },
  {
    slug: "test",
    category: "Тестовые",
    title: "Хаб: тестовые задания и live coding",
    description:
      "Как оценивать сроки, показывать уровень и не выгорать на тестовых задачах.",
  },
  {
    slug: "salary",
    category: "Зарплата",
    title: "Хаб: переговоры по зарплате и офферу",
    description:
      "Диапазоны, аргументация и разбор оффера: как обсуждать компенсацию без стресса.",
  },
];

export function clusterBySlug(slug: string): KnowledgeCluster | null {
  return KNOWLEDGE_CLUSTERS.find((x) => x.slug === slug) ?? null;
}

