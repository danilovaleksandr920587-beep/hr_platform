import Link from "next/link";
import type { VacancyRow } from "@/lib/types";

function tagClass(kind: "exp" | "type" | "format", value: string) {
  if (kind === "exp") return "jtag jtag-exp";
  if (kind === "format") return "jtag jtag-format";
  if (value === "internship") return "jtag jtag-type-intern";
  if (value === "project") return "jtag jtag-type-project";
  if (value === "parttime") return "jtag jtag-type-project";
  return "jtag jtag-format";
}

const expLabels: Record<string, string> = {
  none: "Без опыта",
  lt1: "До 1 года",
  "1-3": "1–3 года",
  gte3: "От 3 лет",
};
const formatLabels: Record<string, string> = {
  remote: "Удалённо",
  hybrid: "Гибрид",
  office: "Офис",
};
const typeLabels: Record<string, string> = {
  internship: "Стажировка",
  project: "Проектная работа",
  parttime: "Подработка",
};

export function VacancyCard({
  row,
  index,
}: {
  row: VacancyRow;
  index: number;
}) {
  const href = `/vacancies/${row.slug}`;
  const salaryMissing = row.salary_min == null || row.salary_max == null;
  const expLabel = expLabels[row.exp] ?? row.exp;
  const typeLabel = typeLabels[row.type] ?? row.type;
  const fmtLabel = formatLabels[row.format] ?? row.format;

  return (
    <article
      className={`job-card vacancy-card-modern${row.featured ? " featured" : ""}`}
    >
      {row.featured ? (
        <span className="featured-badge">Рекомендуем</span>
      ) : null}
      <div className="job-card-top">
        <div className="job-card-left">
          <div className="job-co">{row.company}</div>
          <h2 className="job-title">
            <Link href={href}>{row.title}</Link>
          </h2>
        </div>
        <div className="job-salary-block">
          {salaryMissing ? (
            <div className="job-salary na">Не указана</div>
          ) : (
            <div className="job-salary">
              {row.salary_min!.toLocaleString("ru-RU")} —{" "}
              {row.salary_max!.toLocaleString("ru-RU")} ₽
            </div>
          )}
        </div>
      </div>
      <ul className="job-tags" aria-label="Условия">
        <li>
          <span className={tagClass("exp", row.exp)}>{expLabel}</span>
        </li>
        <li>
          <span className={tagClass("type", row.type)}>{typeLabel}</span>
        </li>
        <li>
          <span className={tagClass("format", row.format)}>{fmtLabel}</span>
        </li>
      </ul>
      {row.description ? <p className="job-desc">{row.description}</p> : null}
      <footer className="job-card-bottom">
        <div className="job-actions">
          <Link className="job-btn-primary vacancy-card-btn" href={href}>
            Откликнуться
          </Link>
          <Link className="job-btn-secondary vacancy-card-btn" href={href}>
            Подробнее
          </Link>
        </div>
        <div className="job-meta-right">
          <span className="job-date">#{index + 1}</span>
        </div>
      </footer>
    </article>
  );
}
