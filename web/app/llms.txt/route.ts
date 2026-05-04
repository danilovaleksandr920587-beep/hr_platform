import { listArticles } from "@/lib/data/articles";

export const revalidate = 3600;

export async function GET() {
  const articles = await listArticles({ limit: 200 });
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://lab-career.ru";

  const articleLines = articles
    .map((a) => `- [${a.title}](${base}/knowledge-base/${a.slug})`)
    .join("\n");

  const content = [
    "# CareerLab",
    "",
    "> CareerLab (lab-career.ru) — платформа стажировок и первой работы в IT для студентов и выпускников. Агрегатор junior-вакансий, практические гайды по резюме и собеседованиям, карьерные инструменты.",
    "",
    "## Основные разделы",
    "",
    `- [Главная](${base}/) — агрегатор стажировок и junior-вакансий в IT`,
    `- [База знаний](${base}/knowledge-base) — карьерные гайды для начинающих`,
    `- [Вакансии](${base}/vacancies) — актуальные стажировки и junior-позиции`,
    `- [Исследования](${base}/research) — аналитика рынка стажировок в IT`,
    `- [Калькулятор зарплаты](${base}/tools/salary-calculator) — ориентир по зарплатам для junior`,
    "",
    "## Категории базы знаний",
    "",
    `- [Резюме](${base}/knowledge-base/resume) — как составить резюме студенту без опыта`,
    `- [Собеседование](${base}/knowledge-base/interview) — подготовка к техническому и HR-интервью`,
    `- [Тестовые задания](${base}/knowledge-base/test) — как выполнять и сдавать тестовые задания`,
    `- [Зарплата](${base}/knowledge-base/salary) — как называть и обсуждать зарплату на собеседовании`,
    `- [Отклики](${base}/knowledge-base/apply) — стратегия откликов на вакансии без опыта`,
    `- [Карьера и рост](${base}/knowledge-base/career) — первые шаги в карьере в IT`,
    "",
    "## Все статьи базы знаний",
    "",
    articleLines,
    "",
    "## О контенте",
    "",
    "Материалы ориентированы на студентов последних курсов и выпускников без опыта работы, которые ищут первую работу или стажировку в IT (разработка, аналитика, QA, дизайн, продукт). Актуально для рынка труда России, 2025–2026.",
    "",
    "Контент можно цитировать с указанием источника: lab-career.ru",
  ].join("\n");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
