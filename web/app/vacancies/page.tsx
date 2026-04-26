import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { VacancyCard } from "@/components/VacancyCard";
import { VacancyFilterForm } from "@/components/VacancyFilterForm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listVacancies, listVacancyFilterOptions } from "@/lib/data/vacancies";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";
import { multiParam, optionalInt, optionalString } from "@/lib/searchParams";

export const metadata: Metadata = {
  title: "Вакансии и стажировки — CareerLab",
  description:
    "Стажировки и junior: фильтры по сфере, опыту, формату и зарплате. Поиск по названию и компании.",
};

export const revalidate = 120;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VacanciesPage({ searchParams }: PageProps) {
  const session = await getSessionFromCookies();
  const sp = await searchParams;
  const q = optionalString(sp, "q");
  const filters = {
    q: q || undefined,
    sphere: multiParam(sp, "sphere"),
    city: multiParam(sp, "city"),
    exp: multiParam(sp, "exp"),
    format: multiParam(sp, "format"),
    type: multiParam(sp, "type"),
    salaryFrom: optionalInt(sp, "salary_from"),
    salaryTo: optionalInt(sp, "salary_to"),
  };

  const supabaseEnvOk = isPublicSupabaseConfigured();
  const [rows, filterOptions] = await Promise.all([
    listVacancies(filters),
    listVacancyFilterOptions(),
  ]);
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
                city: filters.city,
                exp: filters.exp,
                format: filters.format,
                type: filters.type,
                salaryFrom:
                  filters.salaryFrom != null ? String(filters.salaryFrom) : "",
                salaryTo:
                  filters.salaryTo != null ? String(filters.salaryTo) : "",
                q,
              }}
              options={filterOptions}
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
                  {!supabaseEnvOk ? (
                    <>
                      Сервер не видит переменные Supabase: задайте в Vercel{" "}
                      <code>NEXT_PUBLIC_SUPABASE_URL</code> и{" "}
                      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> для того же
                      типа деплоя, что и эта страница (для ссылок вида{" "}
                      <code>*.vercel.app</code> с длинным именем включите
                      переменные для{" "}
                      <strong>Preview</strong>, не только Production), затем
                      Redeploy.
                    </>
                  ) : (
                    <>
                      По выбранным фильтрам ничего не найдено — сбросьте фильтры
                      или измените диапазон зарплаты. Если список должен быть
                      полным, проверьте таблицу <code>vacancies</code> в Supabase
                      и миграции в <code>web/supabase/migrations/</code>.
                    </>
                  )}
                </p>
              ) : (
                <div className="jobs-list">
                  {rows.map((row, i) => (
                    <VacancyCard
                      key={row.id}
                      row={row}
                      index={i}
                      viewerScope={session?.id ?? null}
                    />
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
