import Link from "next/link";
import type { ArticleRow } from "@/lib/types";

const cvClass: Record<string, string> = {
  resume: "cv-resume",
  interview: "cv-interview",
  test: "cv-test",
  salary: "cv-salary",
};

const ctagClass: Record<string, string> = {
  resume: "ctag-resume",
  interview: "ctag-interview",
  test: "ctag-test",
  salary: "ctag-salary",
};

const icon: Record<string, string> = {
  resume: "📄",
  interview: "🎯",
  test: "🧪",
  salary: "💬",
};

export function ArticleCard({ row }: { row: ArticleRow }) {
  const cv = cvClass[row.cat_slug] ?? "cv-resume";
  const ct = ctagClass[row.cat_slug] ?? "ctag-resume";
  const ic = icon[row.cat_slug] ?? "📄";
  const wide =
    row.layout === "wide" || row.layout === "wide-checklist" ? " wide" : "";
  const checklist = row.layout === "wide-checklist" ? " checklist-card" : "";

  return (
    <Link
      href={`/knowledge-base/${row.slug}`}
      className={`article-card${wide}${checklist}`}
      role="link"
    >
      <div className={`card-visual ${cv}`}>
        <span className="card-visual-icon" aria-hidden="true">
          {ic}
        </span>
        <div className="card-visual-preview" aria-hidden="true">
          <span className="cvp-line cvp-line-long" />
          <span className="cvp-line cvp-line-mid" />
          <span className="cvp-line cvp-line-short" />
        </div>
        <span className="card-visual-stat" aria-hidden="true">
          {row.read_time}
        </span>
      </div>
      <div className="card-body">
        <div className="card-tags">
          <span className={`ctag ${ct}`}>{row.category}</span>
          <span className="ctag ctag-time">{row.read_time} мин</span>
          <span className="ctag ctag-level">{row.level}</span>
          {row.is_new ? <span className="ctag ctag-new">Новое</span> : null}
        </div>
        <h2 className="card-title">{row.title}</h2>
        <p className="card-desc">{row.excerpt}</p>
        <div className="card-footer">
          <span className="card-read-btn">Читать →</span>
        </div>
      </div>
    </Link>
  );
}
