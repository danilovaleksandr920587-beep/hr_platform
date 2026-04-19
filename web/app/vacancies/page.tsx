import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { VacancyCard } from "@/components/VacancyCard";
import { VacancyFilterForm } from "@/components/VacancyFilterForm";
import { listVacancies } from "@/lib/data/vacancies";
import { multiParam, optionalInt, optionalString } from "@/lib/searchParams";

export const metadata: Metadata = {
  title: "Вакансии и стажировки — CareerLab",
  description:
    "Стажировки и junior: фильтры по сфере, опыту, формату и зарплате. Поиск по названию и компании.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VacanciesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = optionalString(sp, "q");
  const filters = {
    q: q || undefined,
    sphere: multiParam(sp, "sphere"),
    exp: multiParam(sp, "exp"),
    format: multiParam(sp, "format"),
    type: multiParam(sp, "type"),
    salaryFrom: optionalInt(sp, "salary_from"),
    salaryTo: optionalInt(sp, "salary_to"),
  };

  const rows = await listVacancies(filters);
  const count = rows.length;
  const noun =
    count % 10 === 1 && count % 100 !== 11
      ? "вакансия"
      : count % 10 >= 2 &&
          count % 10 <= 4 &&
          (count % 100 < 10 || count % 100 >= 20)
        ? "вакансии"
        : "вакансий";

  return (
    <>
      <SiteHeader active="/vacancies" />
      <main>
        <div className="page-header">
          <div className="page-header-inner">
            <p className="ph-eyebrow">Стажировки и junior-позиции</p>
            <h1 className="ph-title">Вакансии, где вас ждут</h1>
            <form className="ph-search" action="/vacancies" method="get" role="search">
              <label className="visually-hidden" htmlFor="vacancy-q">
                Поиск по вакансиям
              </label>
              <input
                id="vacancy-q"
                name="q"
                type="search"
                placeholder="Например: аналитик, Python, удалённо…"
                autoComplete="off"
                defaultValue={q}
              />
              <button type="submit">Найти вакансии</button>
            </form>
          </div>
        </div>

        <section className="jl-section">
          <div className="jl-grid">
            <VacancyFilterForm
              selected={{
                sphere: filters.sphere,
                exp: filters.exp,
                format: filters.format,
                type: filters.type,
                salaryFrom:
                  filters.salaryFrom != null ? String(filters.salaryFrom) : "",
                salaryTo:
                  filters.salaryTo != null ? String(filters.salaryTo) : "",
                q,
              }}
            />
            <div className="vacancies-main jl-results">
              <div className="results-meta">
                <h2 className="results-count">
                  Найдено <span>{count}</span>{" "}
                  <span>{noun}</span>{" "}
                  <span className="muted">по вашим условиям</span>
                </h2>
                <select
                  className="sort-select"
                  aria-label="Сортировка"
                  disabled
                  title="Скоро"
                >
                  <option>Сначала новые</option>
                  <option>По зарплате ↑</option>
                  <option>По зарплате ↓</option>
                </select>
              </div>

              {rows.length === 0 ? (
                <p className="vacancies-empty">
                  По выбранным условиям вакансий нет — снимите часть фильтров или
                  измените зарплату. Убедитесь, что миграции Supabase применены и
                  в проекте заданы{" "}
                  <code>NEXT_PUBLIC_SUPABASE_URL</code> и{" "}
                  <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
                </p>
              ) : (
                <div className="jobs-list">
                  {rows.map((row, i) => (
                    <VacancyCard key={row.id} row={row} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
