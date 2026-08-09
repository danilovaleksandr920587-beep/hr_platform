import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { SiteFooter } from "@/components/SiteFooter";
import { VacancyCard } from "@/components/VacancyCard";
import { VacancyFilterForm } from "@/components/VacancyFilterForm";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  diversifyVacanciesByCompany,
  listVacancies,
  listVacancyFacets,
  listVacancyFilterOptions,
  searchVacanciesFuzzy,
  searchVacanciesPage,
  type VacancyFilters,
} from "@/lib/data/vacancies";
import { logSearchQuery } from "@/lib/search/log";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";
import { multiParam, optionalInt, optionalString } from "@/lib/searchParams";
import { vacancyDescriptionPreview } from "@/lib/vacancy-preview";
import type { VacancyRow } from "@/lib/types";

/** Пагинации на странице нет - выдача отдаётся списком целиком. Это потолок
    ответа RPC, а не размер страницы: при 557 опубликованных вакансиях он с
    запасом покрывает и листинг, и любую выдачу вместе с упоминаниями. */
const MAX_ROWS = 1000;

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

function pluralVacancy(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "вакансия";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20))
    return "вакансии";
  return "вакансий";
}

type CardData = { row: VacancyRow; preview: string | null };

/** Тяжёлые поля не должны уезжать в клиентский VacancyCard: полные тексты всех
    вакансий дублировались в HTML и RSC-payload (3.6 МБ). Превью считаем здесь. */
function toCard(row: VacancyRow): CardData {
  return {
    row: {
      ...row,
      description: null,
      description_blocks: null,
      search_document: null,
      company_about: null,
    },
    preview: vacancyDescriptionPreview(row.description, row.description_blocks),
  };
}

type PageData = {
  /** Основная выдача: совпало в названии, компании, городе или стеке. Без
      запроса - весь листинг. */
  primary: CardData[];
  /** Совпало только в тексте описания - свёрнутый блок внизу. */
  mentions: CardData[];
  /** Точных совпадений не нашлось, показаны похожие по написанию названия. */
  fuzzy: boolean;
  filterOptions: Awaited<ReturnType<typeof listVacancyFilterOptions>>;
};

// Страница динамическая (читает cookies для сессии), поэтому segment-level
// revalidate не работал и каждый запрос ходил в Supabase (~0.6с TTFB сверху).
// Кешируем сами данные: ключ - фильтры, TTL 2 минуты.
const getVacanciesPageData = unstable_cache(
  async (filters: VacancyFilters): Promise<PageData> => {
    const [result, facets] = await Promise.all([
      searchVacanciesPage({ ...filters, perPage: MAX_ROWS }),
      listVacancyFacets(filters),
    ]);

    // RPC нет (миграции не применены или другая схема) - собираем страницу
    // по-старому: полный список и рассеивание в приложении.
    if (!result) {
      const [rows, filterOptions] = await Promise.all([
        listVacancies(filters),
        listVacancyFilterOptions(),
      ]);
      const ordered = filters.q ? rows : diversifyVacanciesByCompany(rows);
      return {
        primary: ordered.map(toCard),
        mentions: [],
        fuzzy: false,
        filterOptions: facets ?? filterOptions,
      };
    }

    const filterOptions = facets ?? (await listVacancyFilterOptions());

    // Ноль точных совпадений - пробуем триграммы: «аналитк» -> «аналитик».
    // Только при пустом результате, иначе размывает точную выдачу.
    if (filters.q && result.rows.length === 0) {
      const similar = await searchVacanciesFuzzy(filters.q);
      if (similar.length) {
        return {
          primary: similar.map(toCard),
          mentions: [],
          fuzzy: true,
          filterOptions,
        };
      }
    }

    return {
      primary: result.rows.filter((r) => r.match_tier !== 2).map(toCard),
      mentions: result.rows.filter((r) => r.match_tier === 2).map(toCard),
      fuzzy: false,
      filterOptions,
    };
  },
  ["vacancies-page-data"],
  { revalidate: 120 },
);

export default async function VacanciesPage({ searchParams }: PageProps) {
  const session = await getSessionFromCookies();
  const sp = await searchParams;
  const q = optionalString(sp, "q").trim();

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
  const { primary, mentions, fuzzy, filterOptions } =
    await getVacanciesPageData(filters);

  const searching = Boolean(q);
  const count = primary.length;
  const noun = pluralVacancy(count);

  if (searching) {
    after(() =>
      logSearchQuery({
        q,
        resultsCount: fuzzy ? 0 : count,
        mentionsCount: mentions.length,
        fuzzyUsed: fuzzy,
        filters: {
          sphere: filters.sphere,
          city: filters.city,
          exp: filters.exp,
          format: filters.format,
          type: filters.type,
          salary_from: filters.salaryFrom,
          salary_to: filters.salaryTo,
        },
      }),
    );
  }

  // Закреплённые размещения выносим в отдельную полосу сверху (не больше 3 -
  // «бутиковость» держим намеренно). При поиске полосы нет: наверху должно
  // стоять самое релевантное, а не самое оплаченное (буст за закрепление уже
  // учтён в match_score).
  const featuredStrip = searching
    ? []
    : primary.filter((c) => c.row.featured).slice(0, 3);
  const stripIds = new Set(featuredStrip.map((c) => c.row.id));
  const restCards = primary.filter((c) => !stripIds.has(c.row.id));

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
                  {fuzzy ? (
                    <>
                      Похожие <span className="muted">на «{q}»</span>
                    </>
                  ) : (
                    <>
                      Найдено <span>{count}</span> <span>{noun}</span>{" "}
                      <span className="muted">
                        {searching ? `по запросу «${q}»` : "по вашим условиям"}
                      </span>
                    </>
                  )}
                </h2>
              </div>

              {fuzzy ? (
                <p className="vacancies-empty">
                  Точных совпадений по запросу «{q}» нет. Возможно, вы искали
                  что-то из похожего по написанию:
                </p>
              ) : null}

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

              {primary.length === 0 && mentions.length === 0 ? (
                <p className="vacancies-empty">
                  {searching && supabaseEnvOk ? (
                    <>
                      По запросу «{q}» ничего не нашлось. Попробуйте более общее
                      слово (например, «аналитик» вместо «аналитик данных SQL»)
                      или сбросьте фильтры.
                    </>
                  ) : !supabaseEnvOk ? (
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
                      По выбранным фильтрам ничего не найдено - сбросьте фильтры
                      или измените диапазон зарплаты. Если список должен быть
                      полным, проверьте таблицу <code>vacancies</code> в Supabase
                      и миграции в <code>web/supabase/migrations/</code>.
                    </>
                  )}
                </p>
              ) : (
                <>
                  {restCards.length > 0 ? (
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
                  ) : (
                    <p className="vacancies-empty">
                      В названиях вакансий «{q}» не встречается. Ниже - те, где
                      это упоминается в описании.
                    </p>
                  )}

                  {mentions.length > 0 ? (
                    <details className="mentions-block">
                      <summary className="mentions-summary">
                        Ещё {mentions.length} {pluralVacancy(mentions.length)},
                        где «{q}» есть в описании
                      </summary>
                      <div className="jobs-list mentions-list">
                        {mentions.map(({ row, preview }, i) => (
                          <VacancyCard
                            key={row.id}
                            row={row}
                            index={restCards.length + i}
                            viewerScope={session?.id ?? null}
                            descriptionPreview={preview}
                          />
                        ))}
                      </div>
                    </details>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
