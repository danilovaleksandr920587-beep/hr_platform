import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ArticleBody } from "@/components/ArticleBody";
import { getArticleBySlug, listArticleSlugs } from "@/lib/data/articles";

export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await listArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

const ctagFor: Record<string, string> = {
  resume: "ctag-resume",
  interview: "ctag-interview",
  test: "ctag-test",
  salary: "ctag-salary",
};

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

  const ct = ctagFor[row.cat_slug] ?? "ctag-resume";

  return (
    <>
      <SiteHeader active="/knowledge-base" />
      <main>
        <section className="section section-kb-article">
          <div className="container kb-article-wrap">
            <p className="kb-article-back">
              <Link className="text-link" href="/knowledge-base">
                ← К материалам
              </Link>
            </p>
            <article className="panel kb-article-sheet">
              <header className="kb-article-header">
                <div className="kb-meta-trio kb-meta-trio--article">
                  <span className={`ctag ${ct}`}>{row.category}</span>
                  <span className="ctag ctag-time">{row.read_time} мин</span>
                  <span className="ctag ctag-level">{row.level}</span>
                  {row.is_new ? <span className="ctag ctag-new">Новое</span> : null}
                </div>
                <h1 className="kb-article-h1">{row.title}</h1>
                <p className="kb-article-lead">{row.excerpt}</p>
              </header>
              <ArticleBody markdown={row.body} />
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
