import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { KbArticleTile } from "@/components/knowledge-base/KbArticleTile";
import { listArticles } from "@/lib/data/articles";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";
import { optionalString } from "@/lib/searchParams";
import type { ArticleRow } from "@/lib/types";
import "@/styles/knowledge-base-ref.css";

export const metadata: Metadata = {
  title: "База знаний",
  description:
    "Гайды по резюме, откликам, тестовым заданиям и переговорам о зарплате.",
};

export const revalidate = 120;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildHref(opts: { category: string; level: string; q: string }) {
  const p = new URLSearchParams();
  if (opts.q.trim()) p.set("q", opts.q.trim());
  if (opts.category !== "all") p.set("category", opts.category);
  if (opts.level !== "all") p.set("level", opts.level);
  const qs = p.toString();
  return `/knowledge-base${qs ? `?${qs}` : ""}`;
}

const FB_TABS: {
  id: string;
  label: string;
  pip: string | null;
}[] = [
  { id: "all", label: "Все", pip: null },
  { id: "Резюме", label: "Резюме", pip: "#1a3d80" },
  { id: "Собеседование", label: "Собеседование", pip: "#8b2000" },
  { id: "Тестовые", label: "Тестовые", pip: "#4a1a80" },
  { id: "Зарплата", label: "Зарплата", pip: "#1a5a30" },
];

const LEVELS = [
  { id: "all", label: "Все уровни" },
  { id: "Новичок", label: "Новичок" },
  { id: "Продвинутый", label: "Продвинутый" },
] as const;

const TOPIC_PILLS: {
  category: string;
  slug: string;
  emoji: string;
  label: string;
}[] = [
  { category: "Резюме", slug: "resume", emoji: "📄", label: "Резюме" },
  { category: "Собеседование", slug: "interview", emoji: "🎯", label: "Собеседование" },
  { category: "Тестовые", slug: "test", emoji: "💻", label: "Тестовые" },
  { category: "Зарплата", slug: "salary", emoji: "💰", label: "Зарплата" },
];

const kickerClass: Record<string, string> = {
  resume: "k-resume",
  interview: "k-interv",
  test: "k-test",
  salary: "k-salary",
};

function countByCategory(rows: ArticleRow[], cat: string) {
  return rows.filter((r) => r.category === cat).length;
}

function pickFeatured(rows: ArticleRow[]): {
  main: ArticleRow | null;
  aside: ArticleRow[];
  grid: ArticleRow[];
} {
  if (rows.length === 0) return { main: null, aside: [], grid: [] };
  const byNew = rows.find((r) => r.is_new);
  const ordered = byNew
    ? [byNew, ...rows.filter((r) => r.id !== byNew.id)]
    : [...rows];
  const main = ordered[0] ?? null;
  const aside = ordered.slice(1, 3);
  const grid = ordered.slice(3);
  return { main, aside, grid };
}

function chunkGrid(items: ArticleRow[]) {
  const rows: { layout: "2" | "3" | "2r"; items: ArticleRow[] }[] = [];
  let i = 0;
  let cycle = 0;
  while (i < items.length) {
    const phase = cycle % 3;
    let take = 0;
    let layout: "2" | "3" | "2r" = "3";
    if (phase === 0) {
      layout = "2";
      take = Math.min(2, items.length - i);
    } else if (phase === 1) {
      layout = "3";
      take = Math.min(3, items.length - i);
    } else {
      layout = "2r";
      take = Math.min(2, items.length - i);
    }
    rows.push({ layout, items: items.slice(i, i + take) });
    i += take;
    cycle++;
  }
  return rows;
}

function tileClass(layout: "2" | "3" | "2r", pos: number, rowLen: number): string {
  const parts = ["art"];
  if (layout === "2" && rowLen >= 2) {
    if (pos === 0) parts.push("large", "dark");
    else if (pos === 1) parts.push("large", "lime");
  } else if (layout === "2" && rowLen === 1) {
    parts.push("large");
  }
  if (layout === "2r" && pos === 1) parts.push("large");
  return parts.join(" ");
}

function showDeco(layout: "2" | "3" | "2r", pos: number, rowLen: number) {
  if (layout === "2" && rowLen >= 2) return true;
  if (layout === "2" && rowLen === 1 && pos === 0) return true;
  if (layout === "2r" && pos === 1) return true;
  return false;
}

function ruMaterials(n: number): string {
  const m = n % 100;
  if (m >= 11 && m <= 14) return "материалов";
  const d = n % 10;
  if (d === 1) return "материал";
  if (d >= 2 && d <= 4) return "материала";
  return "материалов";
}

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
  const forCounts =
    category === "all" && level === "all"
      ? rows
      : await listArticles({ q: q || undefined });

  const totalRead = rows.reduce((s, r) => s + (r.read_time || 0), 0);
  const { main, aside, grid } = pickFeatured(rows);
  const gridRows = chunkGrid(grid);

  return (
    <>
      <main>
        <div className="kbref">
          <div className="hero">
            <div className="hero-glow" aria-hidden="true" />
            <div className="hero-glow2" aria-hidden="true" />
            <div className="hero-left">
              <div className="hero-eyebrow">База знаний · CareerLab</div>
              <h1 className="hero-title">
                Гайды, которые
                <br />
                <span>сразу работают</span>
              </h1>
              <p className="hero-sub">
                Резюме, собеседования, зарплата и тестовые — коротко, по делу, с чек-листами.
              </p>
            </div>
            <div className="hero-right">
              <form className="hero-search" action="/knowledge-base" method="get" role="search">
                <label className="visually-hidden" htmlFor="kb-hero-q">
                  Поиск по материалам
                </label>
                <input
                  id="kb-hero-q"
                  name="q"
                  type="search"
                  placeholder="Например: резюме, зарплата, чек-лист…"
                  autoComplete="off"
                  defaultValue={q}
                />
                {category !== "all" ? (
                  <input type="hidden" name="category" value={category} />
                ) : null}
                {level !== "all" ? <input type="hidden" name="level" value={level} /> : null}
                <button type="submit">Найти</button>
              </form>
              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="hero-stat-num">{rows.length}</div>
                  <div className="hero-stat-label">материалов</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-num">~{totalRead}</div>
                  <div className="hero-stat-label">минут чтения</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-num">4</div>
                  <div className="hero-stat-label">темы</div>
                </div>
              </div>
            </div>
          </div>

          <div className="fbar" role="tablist" aria-label="Фильтры материалов">
            {FB_TABS.map((t) => {
              const active = category === t.id;
              const href = buildHref({ category: t.id, level, q });
              return (
                <Link
                  key={t.id}
                  href={href}
                  className={`ftab${active ? " on" : ""}`}
                  role="tab"
                  aria-selected={active}
                >
                  {t.pip ? (
                    <span className="ftab-pip" style={{ background: t.pip }} aria-hidden />
                  ) : null}
                  {t.label}
                </Link>
              );
            })}
            <div className="fbar-sep" aria-hidden="true" />
            {LEVELS.map((lv) => {
              const active = level === lv.id;
              const href = buildHref({ category, level: lv.id, q });
              return (
                <Link
                  key={lv.id}
                  href={href}
                  className={`flevel${active ? " on" : ""}`}
                  role="tab"
                  aria-selected={active}
                >
                  {lv.label}
                </Link>
              );
            })}
            <span className="fbar-end">
              {rows.length} {ruMaterials(rows.length)}
            </span>
          </div>

          <div className="kbref-body">
            {main ? (
              <div className="featured-wrap">
                <Link href={`/knowledge-base/${main.slug}`} className="feat-main">
                  <div
                    className={`kicker ${kickerClass[main.cat_slug] ?? "k-resume"}`}
                    style={{ marginBottom: 14 }}
                  >
                    <span className="kip" />
                    {main.category}
                    {main.is_new ? (
                      <>
                        {" "}
                        · Рекомендуем
                      </>
                    ) : null}
                  </div>
                  <h2 className="feat-title">{main.title}</h2>
                  <p className="feat-desc">{main.excerpt}</p>
                  <div className="feat-bottom">
                    <span className="feat-btn">Читать гайд →</span>
                    <span className="feat-meta">
                      {main.read_time} мин · {main.level}
                    </span>
                  </div>
                </Link>
                <div className="feat-vert-line" aria-hidden="true" />
                <div className="feat-aside">
                  {aside.map((a) => (
                    <Link key={a.id} href={`/knowledge-base/${a.slug}`} className="feat-aside-item">
                      <div className={`kicker ${kickerClass[a.cat_slug] ?? "k-resume"}`}>
                        <span className="kip" />
                        {a.category}
                      </div>
                      <div className="aside-title">{a.title}</div>
                      <p className="aside-desc">{a.excerpt}</p>
                      <div className="aside-meta">
                        {a.read_time} мин
                        {a.is_new ? (
                          <>
                            &nbsp;&nbsp;
                            <span className="badge badge-new">Новое</span>
                          </>
                        ) : (
                          <>
                            {" "}
                            · {a.level}
                          </>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="featured-wrap">
                <div className="feat-main">
                  <p className="feat-desc">Пока нет материалов по выбранным фильтрам.</p>
                </div>
                <div className="feat-vert-line" aria-hidden="true" />
                <div className="feat-aside" />
              </div>
            )}

            <div className="topics-wrap">
              <div className="topics-label">Темы</div>
              <div className="topics-strip">
                {TOPIC_PILLS.map((tp) => {
                  const active = category === tp.category;
                  const n = countByCategory(forCounts, tp.category);
                  const href =
                    q || level !== "all"
                      ? buildHref({
                          category: tp.category,
                          level,
                          q,
                        })
                      : `/knowledge-base/${tp.slug}`;
                  return (
                    <Link
                      key={tp.category}
                      href={href}
                      className={`topic-pill${active ? " on" : ""}`}
                    >
                      <span className="topic-emoji" aria-hidden="true">
                        {tp.emoji}
                      </span>
                      <div className="topic-info">
                        <div className="topic-name">{tp.label}</div>
                        <div className="topic-count">
                          {n} {ruMaterials(n)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                <div className="topic-pill dark-pill" tabIndex={0} role="note">
                  <span className="topic-emoji" aria-hidden="true">
                    ✨
                  </span>
                  <div className="topic-info">
                    <div className="topic-name">Скоро новые</div>
                    <div className="topic-count">в разработке</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sec-head">
              <div className="sec-head-title">Все материалы</div>
              <span className="sec-head-right">
                {grid.length} из {rows.length}
              </span>
            </div>

            {rows.length === 0 ? (
              <div className="articles" style={{ padding: "2rem", background: "var(--white)" }}>
                <p className="feat-desc" style={{ margin: 0 }}>
                  {!supabaseEnvOk ? (
                    <>
                      Сервер не видит <code>NEXT_PUBLIC_SUPABASE_URL</code> и{" "}
                      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — добавьте переменные окружения и
                      сделайте redeploy.
                    </>
                  ) : (
                    <>
                      Попробуйте другой запрос или снимите фильтры. Проверьте таблицу{" "}
                      <code>articles</code> и поле <code>is_published</code>.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="articles">
                {gridRows.map((row) => (
                  <div
                    key={`${row.layout}-${row.items.map((x) => x.id).join("-")}`}
                    className={`art-row art-row-${row.layout}`}
                  >
                    {row.items.map((article, pos) => (
                      <KbArticleTile
                        key={article.id}
                        row={article}
                        className={tileClass(row.layout, pos, row.items.length)}
                        showDeco={showDeco(row.layout, pos, row.items.length)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="promo">
              <div>
                <div className="promo-eyebrow">Интерактив</div>
                <h2 className="promo-title">
                  Готов к
                  <br />
                  <em>первому собесу?</em>
                </h2>
                <p className="promo-desc">
                  5 вопросов — узнаешь, что стоит повторить. Без регистрации, без спама, результат
                  сразу.
                </p>
                <Link className="promo-btn" href="/research">
                  Пройти тест →
                </Link>
              </div>
              <div className="promo-qs">
                <div className="promo-q">
                  <span className="promo-q-num">01</span>
                  <span className="promo-q-text">Как расскажешь о себе за 2 минуты?</span>
                </div>
                <div className="promo-q">
                  <span className="promo-q-num">02</span>
                  <span className="promo-q-text">Почему ты хочешь работать именно здесь?</span>
                </div>
                <div className="promo-q">
                  <span className="promo-q-num">03</span>
                  <span className="promo-q-text">Назови свои слабые стороны</span>
                </div>
                <div className="promo-q">
                  <span className="promo-q-num">04</span>
                  <span className="promo-q-text">Какую зарплату ты ожидаешь?</span>
                </div>
                <div className="promo-q">
                  <span className="promo-q-num">05</span>
                  <span className="promo-q-text">Есть ли вопросы к нам?</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
