import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeArticlePageClient } from "@/components/knowledge-base/KnowledgeArticlePageClient";
import { getArticleBySlug, listArticles } from "@/lib/data/articles";
import { buildArticleStaticParams } from "@/lib/data/article-static-paths";
import "@/styles/knowledge-article-ref.css";

export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return buildArticleStaticParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await getArticleBySlug(slug);
  if (!row) return { title: "Материал не найден" };
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return {
    title: row.title,
    description: row.excerpt,
    alternates: {
      canonical: `${base}/knowledge-base/${row.slug}`,
    },
    openGraph: {
      title: row.title,
      description: row.excerpt,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const row = await getArticleBySlug(slug);
  if (!row) notFound();

  const sameCategory = await listArticles({
    category: row.category,
    limit: 12,
  });
  const recent = await listArticles({ limit: 12 });
  const nextCandidate =
    sameCategory.find((x) => x.slug !== row.slug) ??
    recent.find((x) => x.slug !== row.slug) ??
    null;

  const pool = [...sameCategory, ...recent];
  const uniq = new Map<string, (typeof pool)[number]>();
  for (const item of pool) {
    if (item.slug !== row.slug && !uniq.has(item.slug)) uniq.set(item.slug, item);
  }
  const related = [...uniq.values()]
    .sort((a, b) => {
      const byCategory =
        Number(b.category === row.category) - Number(a.category === row.category);
      if (byCategory !== 0) return byCategory;
      return a.read_time - b.read_time;
    })
    .slice(0, 3)
    .map((x) => ({
      slug: x.slug,
      title: x.title,
      category: x.category,
      read_time: x.read_time,
      is_new: x.is_new,
    }));

  const nextArticle = nextCandidate
    ? {
        slug: nextCandidate.slug,
        title: nextCandidate.title,
        category: nextCandidate.category,
        read_time: nextCandidate.read_time,
        is_new: nextCandidate.is_new,
      }
    : null;

  const clusterByCategory: Record<string, string> = {
    Резюме: "/knowledge-base/resume",
    Собеседование: "/knowledge-base/interview",
    Тестовые: "/knowledge-base/test",
    Зарплата: "/knowledge-base/salary",
    Отклики: "/knowledge-base/apply",
    "Карьера и рост": "/knowledge-base/career",
  };

  const nextSteps = [
    {
      href: clusterByCategory[row.category] ?? "/knowledge-base",
      label: `Хаб по теме «${row.category}»`,
    },
    {
      href: "/vacancies",
      label: "Подобрать вакансии под этот навык",
    },
  ];

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const articleUrl = `${base}/knowledge-base/${row.slug}`;
  const datePublished = row.published_at || new Date().toISOString();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: row.title,
    description: row.excerpt,
    datePublished,
    dateModified: datePublished,
    inLanguage: "ru-RU",
    mainEntityOfPage: articleUrl,
    url: articleUrl,
    articleSection: row.category,
    wordCount: row.body.split(/\s+/).filter(Boolean).length,
    publisher: {
      "@type": "Organization",
      name: "CareerLab",
      url: base,
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: `${base}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "База знаний",
        item: `${base}/knowledge-base`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: row.category,
        item: `${base}${clusterByCategory[row.category] ?? "/knowledge-base"}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: row.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <KnowledgeArticlePageClient
          slug={row.slug}
          title={row.title}
          category={row.category}
          level={row.level}
          excerpt={row.excerpt}
          readTime={row.read_time}
          publishedAt={row.published_at}
          isNew={row.is_new}
          body={row.body}
          nextArticle={nextArticle}
          related={related}
          nextSteps={nextSteps}
        />
      </main>
      <SiteFooter />
    </>
  );
}
