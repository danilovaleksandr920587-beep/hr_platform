"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SAVED_ITEMS_EVENT, readSavedSnapshot, setVacancySaved } from "@/lib/client/saved-items";

type SavedVacancy = {
  slug: string;
  company: string;
  title: string;
  exp: string;
  type: string;
  format: string;
  salary_min: number | null;
  salary_max: number | null;
};

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

function formatSalary(min: number | null, max: number | null) {
  if (min == null || max == null) return "Не указана";
  return `${min.toLocaleString("ru-RU")} — ${max.toLocaleString("ru-RU")} ₽`;
}

export function SavedVacanciesPage({ userScope }: { userScope: string }) {
  const [rows, setRows] = useState<SavedVacancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = async () => {
      const snapshot = readSavedSnapshot(userScope);
      const slugs = [...snapshot.vacancies];
      if (!slugs.length) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/vacancies/by-slugs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs }),
        });
        const data = (await res.json().catch(() => ({ rows: [] }))) as { rows?: SavedVacancy[] };
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } finally {
        setLoading(false);
      }
    };

    void sync();
    window.addEventListener(SAVED_ITEMS_EVENT, sync);
    return () => window.removeEventListener(SAVED_ITEMS_EVENT, sync);
  }, [userScope]);

  return (
    <main>
      <div className="page-header">
        <div className="page-header-inner">
          <p className="ph-eyebrow">Личный кабинет</p>
          <h1 className="ph-title">Сохраненные вакансии</h1>
          <p className="ph-sub">Здесь вакансии, которые вы сохранили для отклика позже</p>
        </div>
      </div>

      <section className="jl-section">
        <div className="container">
          {loading ? (
            <p className="hero-text">Загружаем список...</p>
          ) : rows.length === 0 ? (
            <div className="panel">
              <h2 className="page-title" style={{ fontSize: "clamp(1.3rem,2.2vw,1.7rem)" }}>
                Пока нет сохраненных вакансий
              </h2>
              <p className="hero-text">
                Перейдите в <Link href="/vacancies">поиск вакансий</Link> и нажмите «Сохранить» на карточке.
              </p>
            </div>
          ) : (
            <div className="jobs-list">
              {rows.map((row) => (
                <article key={row.slug} className="job-card vacancy-card-modern">
                  <div className="job-card-top">
                    <div className="job-card-left">
                      <div className="job-co">{row.company}</div>
                      <h2 className="job-title">
                        <Link href={`/vacancies/${row.slug}`}>{row.title}</Link>
                      </h2>
                    </div>
                    <div className="job-salary-block">
                      <div className="job-salary">{formatSalary(row.salary_min, row.salary_max)}</div>
                    </div>
                  </div>
                  <ul className="job-tags">
                    <li><span className="jtag jtag-exp">{expLabels[row.exp] ?? row.exp}</span></li>
                    <li><span className="jtag jtag-format">{typeLabels[row.type] ?? row.type}</span></li>
                    <li><span className="jtag jtag-format">{formatLabels[row.format] ?? row.format}</span></li>
                  </ul>
                  <footer className="job-card-bottom">
                    <div className="job-actions">
                      <Link href={`/vacancies/${row.slug}`} className="job-btn-primary vacancy-card-btn">Подробнее</Link>
                      <button
                        type="button"
                        className="job-btn-secondary vacancy-card-btn"
                        onClick={() => setVacancySaved(row.slug, false, userScope)}
                      >
                        Убрать из сохраненных
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

