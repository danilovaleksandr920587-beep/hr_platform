import Link from "next/link";

const categories: {
  id: string;
  label: string;
  dot?: string;
  pillClass?: string;
}[] = [
  { id: "all", label: "Все" },
  {
    id: "Резюме",
    label: "Резюме",
    dot: "var(--c-resume-accent)",
    pillClass: "cat-resume",
  },
  {
    id: "Собеседование",
    label: "Собеседование",
    dot: "var(--c-interview-accent)",
    pillClass: "cat-interview",
  },
  {
    id: "Тестовые",
    label: "Тестовые",
    dot: "var(--c-test-accent)",
    pillClass: "cat-test",
  },
  {
    id: "Зарплата",
    label: "Зарплата",
    dot: "var(--c-salary-accent)",
    pillClass: "cat-salary",
  },
];

const levels = [
  { id: "all", label: "Все" },
  { id: "Новичок", label: "Новичок" },
  { id: "Продвинутый", label: "Продвинутый" },
];

function buildHref(opts: {
  category: string;
  level: string;
  q: string;
}) {
  const p = new URLSearchParams();
  if (opts.q.trim()) p.set("q", opts.q.trim());
  if (opts.category !== "all") p.set("category", opts.category);
  if (opts.level !== "all") p.set("level", opts.level);
  const qs = p.toString();
  return `/knowledge-base${qs ? `?${qs}` : ""}`;
}

export function KnowledgeBaseFilters({
  category,
  level,
  q,
}: {
  category: string;
  level: string;
  q: string;
}) {
  return (
    <div className="filter-bar">
      <div className="filter-bar-inner">
        <span className="fb-label">Тема:</span>
        <div className="fb-pills" role="tablist" aria-label="Категории материалов">
          {categories.map((c) => {
            const active = category === c.id;
            const href = buildHref({ category: c.id, level, q });
            return (
              <Link
                key={c.id}
                href={href}
                className={`fb-pill${c.pillClass ? ` ${c.pillClass}` : ""}${active ? " active" : ""}`}
                role="tab"
                aria-selected={active}
              >
                {c.dot ? (
                  <span className="fb-dot" style={{ background: c.dot }} />
                ) : null}
                {c.label}
              </Link>
            );
          })}
        </div>
        <span className="fb-sep" aria-hidden="true" />
        <span className="fb-label">Уровень:</span>
        <div role="tablist" aria-label="Уровень материала">
          {levels.map((lv) => {
            const active = level === lv.id;
            const href = buildHref({ category, level: lv.id, q });
            return (
              <Link
                key={lv.id}
                href={href}
                className={`level-pill${active ? " active" : ""}`}
                role="tab"
                aria-selected={active}
              >
                {lv.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
