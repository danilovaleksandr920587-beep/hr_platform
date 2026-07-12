import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { SiteFooter } from "@/components/SiteFooter";
import { VacancyCard } from "@/components/VacancyCard";
import { VacancyFilterForm } from "@/components/VacancyFilterForm";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  diversifyVacanciesByCompany,
  listVacancies,
  listVacancyFilterOptions,
  type VacancyFilters,
} from "@/lib/data/vacancies";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";
import { multiParam, optionalInt, optionalString } from "@/lib/searchParams";
import { vacancyDescriptionPreview } from "@/lib/vacancy-preview";

export const metadata: Metadata = {
  title: "Вакансии и стажировки — CareerLab",
  description:
    "Стажировки и junior-вакансии для студентов и выпускников: фильтры по сфере, опыту, формату и зарплате. Топовые работодатели на CareerLab.",
  alternates: { canonical: "/vacancies" },
  openGraph: {
    title: "Вакансии и стажировки — CareerLab",
    description:
      "Стажировки и junior-вакансии для студентов и выпускников: фильтры по сфере, опыту, формату и зарплате.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Вакансии и стажировки — CareerLab",
    description:
      "Стажировки и junior-вакансии для студентов и выпускников: фильтры по сфере, опыту, формату и зарплате.",
  },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Страница динамическая (читает cookies для сессии), поэтому segment-level
// revalidate не работал и каждый запрос ходил в Supabase (~0.6с TTFB сверху).
// Кешируем сами данные: ключ - фильтры, TTL 2 минуты. Заодно считаем превью
// описаний на сервере и вычищаем тяжёлые поля (description, description_blocks,
// search_document, company_about) до передачи в клиентский VacancyCard - иначе
// полные тексты всех вакансий дублировались в HTML и RSC-payload (3.6 МБ).
const getVacanciesPageData = unstable_cache(
  async (filters: VacancyFilters) => {
    const [rows, filterOptions] = await Promise.all([
      listVacancies(filters),
      listVacancyFilterOptions(),
    ]);
    const ordered = diversifyVacanciesByCompany(rows);
    const cards = ordered.map((row) => ({
      row: {
        ...row,
        description: null,
        description_blocks: null,
        search_document: null,
        company_about: null,
      },
      preview: vacancyDescriptionPreview(row.description, row.description_blocks),
    }));
    return { cards, filterOptions };
  },
  ["vacancies-page-data"],
  { revalidate: 120 },
);

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
  const { cards, filterOptions } = await getVacanciesPageData(filters);
  const count = cards.length;

  // Закреплённые размещения выносим в отдельную полосу сверху (не больше 3 -
  // «бутиковость» держим намеренно). Остальное, включая featured сверх лимита,
  // идёт обычным списком.
  const featuredStrip = cards.filter((c) => c.row.featured).slice(0, 3);
  const stripIds = new Set(featuredStrip.map((c) => c.row.id));
  const restCards = cards.filter((c) => !stripIds.has(c.row.id));
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
              resultCount={count}
              resultNoun={noun}
            />
            <div className="vacancies-main jl-results">
              <div className="results-meta">
                <h2 className="results-count">
                  Найдено <span>{count}</span>{" "}
                  <span>{noun}</span>{" "}
                  <span className="muted">по вашим условиям</span>
                </h2>
              </div>

              {featuredStrip.length > 0 ? (
                <section className="featured-strip" aria-label="Рекомендуемые вакансии">
                  <div className="featured-strip-head">
                    <span className="featured-strip-title">Рекомендуем</span>
                  </div>
                  <div className="jobs-list">
                    {featuredStrip.map(({ row, preview }, i) => (
                      <VacancyCard
                        key={row.id}
                        row={row}
                        index={i}
                        viewerScope={session?.id ?? null}
                        descriptionPreview={preview}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {cards.length === 0 ? (
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
                  {restCards.map(({ row, preview }, i) => (
                    <VacancyCard
                      key={row.id}
                      row={row}
                      index={i}
                      viewerScope={session?.id ?? null}
                      descriptionPreview={preview}
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
