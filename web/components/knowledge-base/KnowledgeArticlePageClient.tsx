"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  SAVED_ITEMS_EVENT,
  isArticleSaved,
  setArticleSaved,
} from "@/lib/client/saved-items";

type RelatedArticle = {
  slug: string;
  title: string;
  category: string;
  read_time: number;
  is_new: boolean;
};

type Props = {
  viewerScope?: string | null;
  slug: string;
  title: string;
  category: string;
  level: string;
  excerpt: string;
  readTime: number;
  publishedAt: string;
  isNew: boolean;
  body: string;
  nextArticle: RelatedArticle | null;
  related: RelatedArticle[];
  nextSteps: Array<{ href: string; label: string }>;
};

type Heading = {
  id: string;
  text: string;
};

const CAT_CLASS: Record<string, string> = {
  resume: "kbad-art-cat--resume",
  interview: "kbad-art-cat--interview",
  test: "kbad-art-cat--test",
  salary: "kbad-art-cat--salary",
};

const VOTE_KEY = "careerlab-kb-article-vote";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Апрель 2026";
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function parseMarkdown(markdown: string) {
  const blocks = markdown.trim().split(/\n\n+/);
  const headings: Heading[] = [];

  for (const block of blocks) {
    const b = block.trim();
    const m = b.match(/^##\s+(.+)$/m) ?? b.match(/^#\s+(.+)$/m);
    if (m) {
      headings.push({
        id: `s-${slugify(m[1])}`,
        text: m[1].trim(),
      });
    }
  }

  const seen = new Map<string, number>();
  const unique = headings.map((h) => {
    const cnt = seen.get(h.id) ?? 0;
    seen.set(h.id, cnt + 1);
    return cnt === 0 ? h : { ...h, id: `${h.id}-${cnt + 1}` };
  });

  return { blocks, headings: unique };
}

function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return <em key={i}>{p.slice(1, -1)}</em>;
    }
    return <span key={i}>{p}</span>;
  });
}

export function KnowledgeArticlePageClient(props: Props) {
  const parsed = useMemo(() => parseMarkdown(props.body), [props.body]);
  const [activeHeading, setActiveHeading] = useState(parsed.headings[0]?.id ?? "");
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(() =>
    typeof window !== "undefined" ? isArticleSaved(props.slug, props.viewerScope) : false,
  );
  const [vote, setVote] = useState<"up" | "down" | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(VOTE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, "up" | "down">) : {};
      return map[props.slug] ?? null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncSaved = () => setSaved(isArticleSaved(props.slug, props.viewerScope));
    window.addEventListener(SAVED_ITEMS_EVENT, syncSaved);
    const timer = window.setTimeout(() => {
      syncSaved();
      try {
        const raw = localStorage.getItem(VOTE_KEY);
        const map = raw ? (JSON.parse(raw) as Record<string, "up" | "down">) : {};
        setVote(map[props.slug] ?? null);
      } catch {
        setVote(null);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(SAVED_ITEMS_EVENT, syncSaved);
    };
  }, [props.slug, props.viewerScope]);

  useEffect(() => {
    const onScroll = () => {
      const article = document.getElementById("kbad-article");
      if (!article) return;
      const total = article.scrollHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(100);
      } else {
        const scrolled = Math.min(Math.max(window.scrollY - (article.offsetTop - 120), 0), total);
        setProgress(Math.round((scrolled / total) * 100));
      }

      let current = parsed.headings[0]?.id ?? "";
      for (const h of parsed.headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < 140) current = h.id;
      }
      setActiveHeading(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [parsed.headings]);

  function toggleSave() {
    const next = !saved;
    setArticleSaved(props.slug, next, props.viewerScope);
    setSaved(next);
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: props.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
  }

  function setVoteValue(v: "up" | "down") {
    try {
      const raw = localStorage.getItem(VOTE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, "up" | "down">) : {};
      map[props.slug] = v;
      localStorage.setItem(VOTE_KEY, JSON.stringify(map));
    } finally {
      setVote(v);
    }
  }

  const headingIdsByBlock = useMemo(() => {
    return parsed.blocks
      .reduce<{ ids: Array<string | null>; headingCount: number }>(
        (acc, block) => {
          const b = block.trim();
          if (!b.startsWith("## ") && !b.startsWith("# ")) {
            return { ids: [...acc.ids, null], headingCount: acc.headingCount };
          }
          const txt = b.replace(/^#{1,2}\s+/, "").trim();
          const id = parsed.headings[acc.headingCount]?.id ?? `s-${slugify(txt)}`;
          return { ids: [...acc.ids, id], headingCount: acc.headingCount + 1 };
        },
        { ids: [], headingCount: 0 },
      )
      .ids;
  }, [parsed.blocks, parsed.headings]);

  return (
    <div className="kbad">
      <div className="kbad-progress-bar" aria-hidden>
        <div className="kbad-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="kbad-breadcrumb">
        <Link className="kbad-bc-link" href="/">Главная</Link>
        <span className="kbad-bc-sep">/</span>
        <Link className="kbad-bc-link" href="/knowledge-base">База знаний</Link>
        <span className="kbad-bc-sep">/</span>
        <span className="kbad-bc-link">{props.category}</span>
        <span className="kbad-bc-sep">/</span>
        <span className="kbad-bc-current">{props.title}</span>
      </div>

      <div className="kbad-layout">
        <aside className="kbad-sidebar-left">
          <div className="kbad-toc-label">Содержание</div>
          <div className="kbad-toc-list">
            {parsed.headings.map((h) => (
              <a
                key={h.id}
                className={`kbad-toc-item${activeHeading === h.id ? " active" : ""}`}
                href={`#${h.id}`}
              >
                {h.text}
              </a>
            ))}
          </div>
          <div className="kbad-toc-divider" />
          <div className="kbad-toc-progress-label">Прочитано</div>
          <div className="kbad-toc-progress-bar">
            <div className="kbad-toc-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </aside>

        <article id="kbad-article" className="kbad-article">
          <header className="kbad-article-header" id={parsed.headings[0]?.id ?? "article-start"}>
            <div className="kbad-art-kicker">
              <div className={`kbad-art-cat ${CAT_CLASS[props.category.toLowerCase()] ?? ""}`}>
                <div className="kbad-art-cat-dot" />
                {props.category}
              </div>
              {props.isNew ? <span className="kbad-art-badge-new">Новое</span> : null}
              <span className="kbad-art-badge-level">{props.level}</span>
            </div>
            <h1 className="kbad-art-title">{props.title}</h1>
            <p className="kbad-art-lead">{props.excerpt}</p>
            <div className="kbad-art-meta-row">
              <div className="kbad-art-meta-item">
                <span className="kbad-art-meta-label">Время чтения</span>
                <span className="kbad-art-meta-value">{props.readTime} минут</span>
              </div>
              <div className="kbad-art-meta-item">
                <span className="kbad-art-meta-label">Обновлено</span>
                <span className="kbad-art-meta-value">{formatDate(props.publishedAt)}</span>
              </div>
              <div className="kbad-art-meta-item">
                <span className="kbad-art-meta-label">Уровень</span>
                <span className="kbad-art-meta-value">{props.level}</span>
              </div>
            </div>
          </header>

          <div className="kbad-key-takeaway">
            <div className="kbad-kt-label">Главная мысль</div>
            <div className="kbad-kt-text">{props.excerpt}</div>
          </div>

          <div className="kbad-article-body">
            <div className="kbad-art-body">
              {parsed.blocks.map((block, i) => {
                const b = block.trim();
                if (!b) return null;

                if (b.startsWith("## ") || b.startsWith("# ")) {
                  const txt = b.replace(/^#{1,2}\s+/, "").trim();
                  const id = headingIdsByBlock[i] ?? `s-${slugify(txt)}`;
                  return <h2 key={i} id={id}>{txt}</h2>;
                }

                if (b.startsWith("### ")) {
                  return <h3 key={i}>{b.replace(/^###\s+/, "").trim()}</h3>;
                }

                const lines = b.split("\n").map((x) => x.trim()).filter(Boolean);

                if (lines.every((line) => line.startsWith("- "))) {
                  return (
                    <ul key={i} className="kbad-ul">
                      {lines.map((line, j) => (
                        <li key={j}>{renderInline(line.slice(2))}</li>
                      ))}
                    </ul>
                  );
                }

                if (lines.every((line) => line.startsWith("|"))) {
                  const rows = lines.map((l) => l.split("|").map((c) => c.trim()).filter(Boolean));
                  if (rows.length >= 2) {
                    const head = rows[0];
                    const bodyRows = rows.slice(2);
                    return (
                      <table key={i} className="kbad-art-table">
                        <thead>
                          <tr>{head.map((h, j) => <th key={j}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {bodyRows.map((r, ri) => (
                            <tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c)}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  }
                }

                return (
                  <p key={i}>
                    {lines.map((line, j) => (
                      <span key={j}>
                        {j > 0 ? <br /> : null}
                        {renderInline(line)}
                      </span>
                    ))}
                  </p>
                );
              })}
            </div>
          </div>

          <div className="kbad-article-footer">
            <div className="kbad-af-actions">
              <button type="button" className="kbad-af-btn kbad-af-btn-save" onClick={toggleSave}>
                {saved ? "♥ Сохранено" : "♡ Сохранить"}
              </button>
              <button type="button" className="kbad-af-btn kbad-af-btn-share" onClick={share}>
                ↑ Поделиться
              </button>
            </div>
            <div className="kbad-af-useful">
              <span className="kbad-af-useful-label">Материал полезен?</span>
              <button
                type="button"
                className={`kbad-af-vote${vote === "up" ? " voted" : ""}`}
                onClick={() => setVoteValue("up")}
              >
                👍
              </button>
              <button
                type="button"
                className={`kbad-af-vote${vote === "down" ? " voted" : ""}`}
                onClick={() => setVoteValue("down")}
              >
                👎
              </button>
            </div>
          </div>
        </article>

        <aside className="kbad-sidebar-right">
          {props.nextArticle ? (
            <Link className="kbad-next-card" href={`/knowledge-base/${props.nextArticle.slug}`}>
              <div className="kbad-next-card-header">
                <div className="kbad-next-card-label">Следующий гайд</div>
                <div className="kbad-next-card-cat">{props.nextArticle.category}</div>
              </div>
              <div className="kbad-next-card-body">
                <div className="kbad-next-card-title">{props.nextArticle.title}</div>
                <div className="kbad-next-card-meta">
                  {props.nextArticle.read_time} мин{props.nextArticle.is_new ? " · Новое" : ""}
                </div>
              </div>
              <div className="kbad-next-card-btn">Читать →</div>
            </Link>
          ) : null}

          <div className="kbad-info-widget">
            <div className="kbad-iw-title">О материале</div>
            <div className="kbad-iw-items">
              <div className="kbad-iw-item"><div className="kbad-iw-icon">⏱</div><div className="kbad-iw-text"><strong>{props.readTime} минут</strong> чтения</div></div>
              <div className="kbad-iw-item"><div className="kbad-iw-icon">📅</div><div className="kbad-iw-text">Обновлено <strong>{formatDate(props.publishedAt)}</strong></div></div>
              <div className="kbad-iw-item"><div className="kbad-iw-icon">✅</div><div className="kbad-iw-text"><strong>Практический</strong> формат</div></div>
            </div>
          </div>

          {props.related.length ? (
            <div className="kbad-related-widget">
              <div className="kbad-rw-header"><div className="kbad-rw-title">По теме</div></div>
              {props.related.map((r) => (
                <Link key={r.slug} href={`/knowledge-base/${r.slug}`} className="kbad-rw-item">
                  <div className="kbad-rw-item-cat">{r.category}</div>
                  <div className="kbad-rw-item-title">{r.title}</div>
                  <div className="kbad-rw-item-time">{r.read_time} мин</div>
                </Link>
              ))}
            </div>
          ) : null}

          {props.nextSteps.length ? (
            <div className="kbad-related-widget">
              <div className="kbad-rw-header">
                <div className="kbad-rw-title">Следующий шаг</div>
              </div>
              {props.nextSteps.map((item) => (
                <Link key={item.href} href={item.href} className="kbad-rw-item">
                  <div className="kbad-rw-item-title">{item.label}</div>
                </Link>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
