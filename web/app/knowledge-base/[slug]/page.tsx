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
  return {
    title: row.title,
    description: row.excerpt,
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

  const all = await listArticles({});
  const currentIndex = all.findIndex((x) => x.slug === row.slug);

  const nextCandidate =
    currentIndex >= 0 && currentIndex + 1 < all.length
      ? all[currentIndex + 1]
      : all.find((x) => x.slug !== row.slug) ?? null;

  const related = all
    .filter((x) => x.slug !== row.slug)
    .sort((a, b) => {
      const byCategory = Number(b.category === row.category) - Number(a.category === row.category);
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

  return (
    <>
      <main>
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
        />
      </main>
      <SiteFooter />
    </>
  );
}
