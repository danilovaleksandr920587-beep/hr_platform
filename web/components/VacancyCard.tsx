"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  SAVED_ITEMS_EVENT,
  isVacancySaved,
  setVacancySaved,
} from "@/lib/client/saved-items";
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
  viewerScope,
}: {
  row: VacancyRow;
  index: number;
  viewerScope?: string | null;
}) {
  const [saved, setSaved] = useState(false);
  const [loginHint, setLoginHint] = useState(false);
  const loginHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const href = `/vacancies/${row.slug}`;
  const salaryMissing = row.salary_min == null || row.salary_max == null;
  const expLabel = expLabels[row.exp] ?? row.exp;
  const typeLabel = typeLabels[row.type] ?? row.type;
  const fmtLabel = formatLabels[row.format] ?? row.format;
  const isLoggedIn = Boolean(viewerScope);

  useEffect(() => {
    if (!isLoggedIn) return;
    const sync = () => setSaved(isVacancySaved(row.slug, viewerScope));
    sync();
    window.addEventListener(SAVED_ITEMS_EVENT, sync);
    return () => window.removeEventListener(SAVED_ITEMS_EVENT, sync);
  }, [row.slug, viewerScope, isLoggedIn]);

  function toggleSave() {
    if (!isLoggedIn) {
      setLoginHint(true);
      if (loginHintTimer.current) clearTimeout(loginHintTimer.current);
      loginHintTimer.current = setTimeout(() => setLoginHint(false), 3500);
      return;
    }
    const next = !saved;
    setVacancySaved(row.slug, next, viewerScope);
    setSaved(next);
  }

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
          <button
            type="button"
            className="job-btn-secondary vacancy-card-btn"
            onClick={toggleSave}
            aria-pressed={saved}
          >
            {saved ? "♥ Сохранено" : "♡ Сохранить"}
          </button>
        </div>
        <div className="job-meta-right">
          <span className="job-date">#{index + 1}</span>
        </div>
      </footer>
      {loginHint ? (
        <div
          style={{
            marginTop: 8,
            padding: "8px 14px",
            background: "#fff4d6",
            borderRadius: 10,
            fontSize: 13,
            color: "#7a5a00",
          }}
        >
          Чтобы сохранять вакансии,{" "}
          <Link href="/login?next=/vacancies" style={{ color: "#7a5a00", fontWeight: 600 }}>
            войдите или зарегистрируйтесь
          </Link>
        </div>
      ) : null}
    </article>
  );
}
