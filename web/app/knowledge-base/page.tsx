import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleCard } from "@/components/ArticleCard";
import { KnowledgeBaseFilters } from "@/components/KnowledgeBaseFilters";
import { listArticles } from "@/lib/data/articles";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";
import { optionalString } from "@/lib/searchParams";

export const metadata: Metadata = {
  title: "База знаний",
  description:
    "Гайды по резюме, откликам, тестовым заданиям и переговорам о зарплате.",
};

export const revalidate = 120;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KnowledgeBasePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = optionalString(sp, "q");
  const rawCat = optionalString(sp, "category");
  const rawLevel = optionalString(sp, "level");
  const category = rawCat || "all";
  const level = rawLevel || "all";

  const supabaseEnvOk = isPublicSupabaseConfigured();
  const rows = await listArticles({
    q: q || undefined,
    category: category === "all" ? undefined : category,
    level: level === "all" ? undefined : level,
  });

  const totalRead = rows.reduce((s, r) => s + (r.read_time || 0), 0);
  const featured = rows.find((r) => r.is_new) ?? rows[0];
  const rest = featured ? rows.filter((r) => r.id !== featured.id) : rows;

  return (
    <>
      <main>
        <div className="page-header page-header--kb">
          <div className="ph-glow" aria-hidden="true" />
          <div className="ph-glow2" aria-hidden="true" />
          <div className="page-header-inner">
            <p className="ph-eyebrow">Практические материалы</p>
            <h1 className="ph-title">
              Гайды, которые<br />
              <span>сразу применяются</span>
            </h1>
            <p className="ph-sub">
              Резюме, отклики, собеседования и первые месяцы на работе — выбирайте
              тему или ищите, читайте без лишнего шума.
            </p>
            <form
              className="ph-search"
              action="/knowledge-base"
              method="get"
              role="search"
            >
              <label className="visually-hidden" htmlFor="kb-q">
                Поиск по материалам
              </label>
              <input
                id="kb-q"
                name="q"
                type="search"
                placeholder="Например: сопроводительное письмо, зарплата…"
                autoComplete="off"
                defaultValue={q}
              />
              {category !== "all" ? (
                <input type="hidden" name="category" value={category} />
              ) : null}
              {level !== "all" ? (
                <input type="hidden" name="level" value={level} />
              ) : null}
              <button type="submit">Найти материал</button>
            </form>
          </div>
        </div>

        <div className="stats-row">
          <div className="stats-row-inner">
            <div className="stat-item">
              <span className="stat-num">{rows.length}</span>
              <span className="stat-label">материалов</span>
            </div>
            <span className="stat-sep" aria-hidden="true" />
            <div className="stat-item">
              <span className="stat-num">~{totalRead}</span>
              <span className="stat-label">минут чтения</span>
            </div>
            <span className="stat-sep" aria-hidden="true" />
            <div className="stat-item">
              <span className="stat-num">4</span>
              <span className="stat-label">темы</span>
            </div>
            <span className="stat-sep" aria-hidden="true" />
            <div className="stats-row-meta">Обновлено в 2026</div>
          </div>
        </div>

        <KnowledgeBaseFilters
          category={category}
          level={level}
          q={q}
        />

        <div className="page-body">
          <div className="page-body-inner">
            {featured ? (
              <Link
                className={`featured-article${featured.layout === "wide" || featured.layout === "wide-checklist" ? " wide" : ""}`}
                href={`/knowledge-base/${featured.slug}`}
              >
                <div className="featured-content">
                  <div>
                    <div className="featured-meta">
                      <span
                        className={`ctag ${featured.cat_slug === "resume" ? "ctag-resume" : featured.cat_slug === "interview" ? "ctag-interview" : featured.cat_slug === "test" ? "ctag-test" : "ctag-salary"}`}
                      >
                        {featured.category}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--muted2)" }}>
                        {featured.read_time} мин
                      </span>
                      <span style={{ fontSize: 12, color: "var(--muted2)" }}>
                        ·
                      </span>
                      <span style={{ fontSize: 12, color: "var(--muted2)" }}>
                        {featured.level}
                      </span>
                    </div>
                    <h2 className="featured-title">{featured.title}</h2>
                    <p className="featured-desc">{featured.excerpt}</p>
                  </div>
                  <div className="featured-footer">
                    <span className="featured-read-btn">Читать гайд →</span>
                    <span className="featured-time">
                      ⏱ {featured.read_time} минут
                    </span>
                  </div>
                </div>
                <div
                  className={`featured-panel fp-${featured.cat_slug === "resume" ? "resume" : featured.cat_slug === "interview" ? "interview" : featured.cat_slug === "test" ? "test" : "salary"}`}
                >
                  <span className="fp-icon" aria-hidden="true">
                    {featured.cat_slug === "resume"
                      ? "📄"
                      : featured.cat_slug === "interview"
                        ? "🎯"
                        : featured.cat_slug === "test"
                          ? "🧪"
                          : "💬"}
                  </span>
                  <div className="fp-checklist">
                    <div className="fp-item">
                      <span
                        className="fp-item-dot"
                        style={{
                          background:
                            featured.cat_slug === "resume"
                              ? "var(--c-resume-accent)"
                              : featured.cat_slug === "interview"
                                ? "var(--c-interview-accent)"
                                : featured.cat_slug === "test"
                                  ? "var(--c-test-accent)"
                                  : "var(--c-salary-accent)",
                        }}
                      />
                      Практические шаги из гайда
                    </div>
                    <div className="fp-item">
                      <span
                        className="fp-item-dot"
                        style={{
                          background:
                            featured.cat_slug === "resume"
                              ? "var(--c-resume-accent)"
                              : featured.cat_slug === "interview"
                                ? "var(--c-interview-accent)"
                                : featured.cat_slug === "test"
                                  ? "var(--c-test-accent)"
                                  : "var(--c-salary-accent)",
                        }}
                      />
                      Уровень: {featured.level}
                    </div>
                    <div className="fp-item">
                      <span
                        className="fp-item-dot"
                        style={{
                          background:
                            featured.cat_slug === "resume"
                              ? "var(--c-resume-accent)"
                              : featured.cat_slug === "interview"
                                ? "var(--c-interview-accent)"
                                : featured.cat_slug === "test"
                                  ? "var(--c-test-accent)"
                                  : "var(--c-salary-accent)",
                        }}
                      />
                      Читайте на любой экран
                    </div>
                  </div>
                </div>
              </Link>
            ) : null}

            <div className="section-hdr">
              <h2 className="section-hdr-title">Все материалы</h2>
              <span className="section-hdr-count">
                {rest.length} из {rows.length}
              </span>
            </div>

            {rows.length === 0 ? (
              <div className="kb-empty-panel">
                <p className="kb-empty-title">Ничего не нашли</p>
                <p className="kb-empty-text">
                  {!supabaseEnvOk ? (
                    <>
                      Сервер не видит <code>NEXT_PUBLIC_SUPABASE_URL</code> и{" "}
                      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — в Vercel
                      добавьте их для <strong>Preview</strong> и{" "}
                      <strong>Production</strong> (для preview-URL это частая
                      причина пустого списка), затем Redeploy.
                    </>
                  ) : (
                    <>
                      Попробуйте другой запрос или снимите фильтры. Если
                      материалов всё равно нет, проверьте таблицу{" "}
                      <code>articles</code> и миграции в{" "}
                      <code>web/supabase/migrations/</code>.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="articles-grid">
                {rest.map((row) => (
                  <ArticleCard key={row.id} row={row} />
                ))}
              </div>
            )}

            <button type="button" className="load-more" disabled title="Скоро">
              Загрузить ещё материалы
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
