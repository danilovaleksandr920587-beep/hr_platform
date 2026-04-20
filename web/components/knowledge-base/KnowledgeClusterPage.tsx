import Link from "next/link";
import { listArticles } from "@/lib/data/articles";
import type { KnowledgeCluster } from "@/lib/knowledge-clusters";

export async function KnowledgeClusterPage({
  cluster,
}: {
  cluster: KnowledgeCluster;
}) {
  const rows = await listArticles({ category: cluster.category });
  const featured = rows[0] ?? null;
  const rest = rows.slice(1);

  return (
    <main className="kc-page">
      <section className="kc-hero">
        <div className="kc-hero-inner">
          <p className="kc-eyebrow">Тематический хаб</p>
          <h1 className="kc-title">{cluster.title}</h1>
          <p className="kc-sub">{cluster.description}</p>
          <div className="kc-hero-links">
            <Link href="/knowledge-base" className="kc-pill-link">
              Все статьи
            </Link>
            <Link href="/vacancies" className="kc-pill-link kc-pill-link--dark">
              Вакансии по теме
            </Link>
          </div>
        </div>
      </section>

      <section className="kc-content">
        <div className="kc-content-inner">
          {featured ? (
            <Link href={`/knowledge-base/${featured.slug}`} className="kc-featured">
              <span className="kc-featured-label">Основной материал</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <span className="kc-meta">
                {featured.read_time} мин · {featured.level}
              </span>
            </Link>
          ) : (
            <div className="kc-empty">
              Материалы по теме пока готовятся. Проверьте раздел позже.
            </div>
          )}

          {rest.length ? (
            <div className="kc-grid">
              {rest.map((row) => (
                <Link key={row.id} href={`/knowledge-base/${row.slug}`} className="kc-card">
                  <h3>{row.title}</h3>
                  <p>{row.excerpt}</p>
                  <span className="kc-meta">
                    {row.read_time} мин · {row.level}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

