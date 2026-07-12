import type { Metadata } from "next";
import Link from "next/link";
import { HomeClRevealInit } from "@/components/home/HomeClRevealInit";
import { HomeStatsTabs } from "@/components/home/HomeStatsTabs";
import { SphereIcon } from "@/components/home/SphereIcon";
import { SiteFooter } from "@/components/SiteFooter";
import { listArticles } from "@/lib/data/articles";
import { listVacancies } from "@/lib/data/vacancies";
import { listPublicCompanies } from "@/lib/company/public";
import { KNOWLEDGE_CLUSTERS } from "@/lib/knowledge-clusters";
import type { VacancyRow } from "@/lib/types";
import { SPHERE_LABELS } from "@/lib/vacancy-labels";
import "@/styles/home-redesign.css";

// Плашка "Свежие стажировки" в hero берёт вакансии из БД: без ревалидации
// статическая главная замораживала их до следующего деплоя.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: {
    absolute:
      "CareerLab — Стажировки и Junior-вакансии | Первая работа для студентов",
  },
  description:
    "Стажировки и junior-вакансии, зарплатные ориентиры и гайды к интервью — в одном месте.",
  alternates: { canonical: "/" },
  openGraph: {
    title:
      "CareerLab — Стажировки и Junior-вакансии | Первая работа для студентов",
    description:
      "Стажировки и junior-вакансии, зарплатные ориентиры и гайды к интервью — в одном месте.",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "CareerLab — Стажировки и Junior-вакансии | Первая работа для студентов",
    description:
      "Стажировки и junior-вакансии, зарплатные ориентиры и гайды к интервью — в одном месте.",
  },
};

function formatJobSalary(min: number | null, max: number | null): string {
  const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)} ₽`;
  if (max != null) return `до ${fmt(max)} ₽`;
  if (min != null) return `от ${fmt(min)} ₽`;
  return "";
}

function jobMeta(row: VacancyRow): string {
  return [row.company, row.format || row.type].filter(Boolean).join(" · ");
}

function vacancyNoun(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "вакансия";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "вакансии";
  return "вакансий";
}

function pickDiverseVacancies(rows: VacancyRow[], count = 3): VacancyRow[] {
  const seen = { companies: new Set<string>(), spheres: new Set<string>() };
  const result: VacancyRow[] = [];
  for (const row of rows) {
    if (result.length >= count) break;
    if (seen.companies.has(row.company) || seen.spheres.has(row.sphere)) continue;
    result.push(row);
    seen.companies.add(row.company);
    seen.spheres.add(row.sphere);
  }
  // Fallback: relax sphere uniqueness if not enough
  if (result.length < count) {
    for (const row of rows) {
      if (result.length >= count) break;
      if (result.includes(row)) continue;
      if (seen.companies.has(row.company)) continue;
      result.push(row);
      seen.companies.add(row.company);
    }
  }
  return result;
}

// Витринные названия сфер: там, где ярлык из фильтров слишком сухой.
const BENTO_NAMES: Record<string, string> = {
  it: "IT и разработка",
  devops: "DevOps / SRE",
};

// Фолбэк, когда БД недоступна (локальная сборка без env): показываем
// основные сферы без счётчиков.
const BENTO_FALLBACK = [
  "it",
  "analytics",
  "finance",
  "marketing",
  "design",
  "product",
  "hr",
];

export default async function HomePage() {
  const [allVacancies, allArticles, partnerCompanies] = await Promise.all([
    listVacancies({ fields: "card", limit: 1000 }),
    listArticles(),
    listPublicCompanies().catch(() => []),
  ]);
  const partners = partnerCompanies.slice(0, 8);

  const vacancyCount = allVacancies.length;
  const freshArticles = allArticles.slice(0, 4);

  // Hero-плашка и секция "Свежие вакансии" показывают РАЗНЫЕ вакансии:
  // одна выборка из 6 разнообразных, первые 3 - наверх, остальные - в сетку.
  const preview = pickDiverseVacancies(allVacancies, 6);
  const heroVacancies = preview.slice(0, 3);
  const gridVacancies = preview.slice(3, 6);

  const sphereCounts = new Map<string, number>();
  for (const row of allVacancies) {
    const s = (row.sphere || "").trim();
    if (!s) continue;
    sphereCounts.set(s, (sphereCounts.get(s) ?? 0) + 1);
  }
  const bentoSpheres: Array<[string, number]> =
    sphereCounts.size >= 4
      ? Array.from(sphereCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 7)
      : BENTO_FALLBACK.map((s): [string, number] => [s, sphereCounts.get(s) ?? 0]);

  return (
    <div className="home-careerlab-scope">
      <HomeClRevealInit />

      <main>
        <section className="cl-hero" aria-labelledby="cl-hero-title">
          <div className="cl-hero-blob" aria-hidden="true" />
          <div className="cl-hero-blob2" aria-hidden="true" />

          <div className="cl-hero-float" aria-label="Свежие стажировки">
            <div className="cl-hf-label">Свежие стажировки</div>
            {heroVacancies.length ? (
              heroVacancies.map((vacancy, idx) => (
                <Link
                  key={vacancy.slug}
                  href={`/vacancies/${vacancy.slug}`}
                  className="cl-hf-row"
                >
                  <div>
                    <div className="cl-hf-job">{vacancy.title}</div>
                    <div className="cl-hf-meta">{jobMeta(vacancy)}</div>
                  </div>
                  {formatJobSalary(vacancy.salary_min, vacancy.salary_max) ? (
                    <span className={`cl-hf-tag ${idx === 0 ? "cl-hf-tag--lime" : "cl-hf-tag--gray"}`}>
                      {formatJobSalary(vacancy.salary_min, vacancy.salary_max)}
                    </span>
                  ) : null}
                </Link>
              ))
            ) : (
              <div className="cl-hf-row">
                <div>
                  <div className="cl-hf-job">Сейчас обновляем подборку</div>
                  <div className="cl-hf-meta">Загляните в полный список вакансий</div>
                </div>
                <span className="cl-hf-tag cl-hf-tag--gray">—</span>
              </div>
            )}
            <Link href="/vacancies" className="cl-hf-more">
              Смотреть все вакансии
            </Link>
          </div>

          <p className="cl-hero-eyebrow">для студентов и выпускников</p>
          <h1 id="cl-hero-title" className="cl-hero-title">
            Всё для
            <br />
            первого
            <br />
            <em>оффера.</em>
          </h1>
          <p className="cl-hero-sub">
            Стажировки и junior-вакансии, зарплатные ориентиры и гайды к интервью — в одном
            месте.
          </p>
          <div className="cl-hero-search-wrap">
            <form className="cl-hero-search" action="/vacancies" method="get" role="search">
              <label className="visually-hidden" htmlFor="cl-hero-q">
                Поиск вакансии
              </label>
              <input
                id="cl-hero-q"
                name="q"
                type="search"
                autoComplete="off"
                placeholder="Найти стажировку или junior-вакансию…"
              />
              <button type="submit">Найти</button>
            </form>
          </div>
          <div className="cl-hero-stats">
            <Link href="/vacancies" className="cl-hero-stat">
              <div className="cl-hero-stat-num">
                {vacancyCount > 0 ? `${vacancyCount} ${vacancyNoun(vacancyCount)}` : "Вакансии"}
              </div>
              <div className="cl-hero-stat-label">стажировки и junior</div>
            </Link>
            <Link href="/tools/resume-analyzer" className="cl-hero-stat">
              <div className="cl-hero-stat-num">AI-разбор</div>
              <div className="cl-hero-stat-label">резюме за минуту</div>
            </Link>
            <Link href="/tools/salary-calculator" className="cl-hero-stat">
              <div className="cl-hero-stat-num">Зарплаты</div>
              <div className="cl-hero-stat-label">и карьерные треки по рынку</div>
            </Link>
          </div>
        </section>

        <div className="cl-logos-strip" aria-label="Работодатели">
          <span className="cl-logos-label">Работодатели</span>
          <div className="cl-logos-items">
            <span className="cl-logos-item">Сбер</span>
            <span className="cl-logos-item">Яндекс</span>
            <span className="cl-logos-item">Т‑Банк</span>
            <span className="cl-logos-item">ВТБ</span>
            <span className="cl-logos-item">МТС</span>
            <span className="cl-logos-item">Газпром нефть</span>
            <span className="cl-logos-item">Авито</span>
            <span className="cl-logos-item">Ozon</span>
          </div>
        </div>

        {partners.length > 0 ? (
          <section className="cl-partners-strip" aria-label="Компании-партнёры, нанимающие сейчас">
            <div className="cl-partners-head">
              <span className="cl-partners-label">Нанимают сейчас</span>
              <Link href="/companies" className="cl-partners-all">
                Все компании →
              </Link>
            </div>
            <div className="cl-partners-items">
              {partners.map((c) => (
                <Link key={c.id} href={`/companies/${c.slug}`} className="cl-partner-chip">
                  {c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="cl-partner-logo" src={c.logo_url} alt={c.name} />
                  ) : null}
                  <span className="cl-partner-name">{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="cl-audience-section" aria-labelledby="cl-aud-title">
          <div className="cl-audience-inner">
            <div className="cl-audience-left cl-reveal">
              <p className="cl-sec-eyebrow">с чего начать</p>
              <h2 id="cl-aud-title" className="cl-sec-title">
                Найди своё
              </h2>
              <p className="cl-audience-desc">
                Два пути к первому офферу — выбери сценарий и переходи к своей подборке
                вакансий.
              </p>
            </div>
            <div className="cl-audience-right">
              <Link
                href="/vacancies?type=internship"
                className="cl-aud-card cl-reveal cl-reveal-d1"
              >
                <div>
                  <div className="cl-aud-card-num">01</div>
                  <div className="cl-aud-card-title">Я студент</div>
                  <div className="cl-aud-card-desc">
                    Ищу стажировку параллельно с учёбой — оплачиваемую, с гибким графиком и
                    ментором внутри.
                  </div>
                  <div className="cl-aud-pills">
                    <span className="cl-pill cl-pill--lime">Стажировки</span>
                    <span className="cl-pill cl-pill--outline">Частичная занятость</span>
                    <span className="cl-pill cl-pill--outline">Без опыта</span>
                  </div>
                </div>
                <div className="cl-aud-arrow" aria-hidden="true">
                  →
                </div>
              </Link>
              <Link
                href="/vacancies?exp=none&exp=lt1"
                className="cl-aud-card cl-reveal cl-reveal-d2"
              >
                <div>
                  <div className="cl-aud-card-num">02</div>
                  <div className="cl-aud-card-title">Я выпускник / джун</div>
                  <div className="cl-aud-card-desc">
                    Уже есть база, хочу первую полноценную работу с нормальной зарплатой и ростом.
                  </div>
                  <div className="cl-aud-pills">
                    <span className="cl-pill cl-pill--lime">Junior-позиции</span>
                    <span className="cl-pill cl-pill--outline">Полная занятость</span>
                    <span className="cl-pill cl-pill--outline">Без опыта и до года</span>
                  </div>
                </div>
                <div className="cl-aud-arrow" aria-hidden="true">
                  →
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className="cl-directions-section" aria-labelledby="cl-dir-title">
          <div className="cl-shell">
            <p className="cl-sec-eyebrow">куда расти</p>
            <h2 id="cl-dir-title" className="cl-sec-title" style={{ marginBottom: 36 }}>
              Выбери направление
            </h2>
            <div className="cl-bento cl-reveal">
              {bentoSpheres.map(([sphere, count], idx) => (
                <Link
                  key={sphere}
                  href={`/vacancies?sphere=${encodeURIComponent(sphere)}`}
                  className={
                    idx === 0
                      ? "cl-bento-card cl-bento-card--large cl-bento-card--featured"
                      : "cl-bento-card"
                  }
                >
                  <span className="cl-bento-icon">
                    <SphereIcon sphere={sphere} />
                  </span>
                  <span className="cl-bento-name">
                    {BENTO_NAMES[sphere] ?? SPHERE_LABELS[sphere] ?? sphere}
                  </span>
                  {count > 0 ? (
                    <span className="cl-bento-count">
                      {count} {vacancyNoun(count)}
                    </span>
                  ) : null}
                  <span className="cl-bento-num">{String(idx + 1).padStart(2, "0")}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="cl-tools-section" aria-labelledby="cl-tools-title">
          <div className="cl-shell">
            <p className="cl-sec-eyebrow">инструменты</p>
            <h2 id="cl-tools-title" className="cl-sec-title" style={{ marginBottom: 36 }}>
              Не просто список вакансий
            </h2>
            <div className="cl-tools-grid">
              <Link href="/tools/resume-analyzer" className="cl-tool-card cl-reveal cl-reveal-d1">
                <span className="cl-tool-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="13" y2="17" />
                  </svg>
                </span>
                <span className="cl-tool-title">AI-разбор резюме</span>
                <p className="cl-tool-desc">
                  Загрузите резюме — AI найдёт слабые места и подскажет конкретные правки за
                  минуту.
                </p>
                <span className="cl-tool-cta">Проверить резюме →</span>
              </Link>
              <Link href="/tools/salary-calculator" className="cl-tool-card cl-reveal cl-reveal-d2">
                <span className="cl-tool-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <rect x="8" y="7" width="8" height="3" rx="1" />
                    <line x1="8" y1="14" x2="8" y2="14.01" />
                    <line x1="12" y1="14" x2="12" y2="14.01" />
                    <line x1="16" y1="14" x2="16" y2="14.01" />
                    <line x1="8" y1="17" x2="8" y2="17.01" />
                    <line x1="12" y1="17" x2="12" y2="17.01" />
                    <line x1="16" y1="17" x2="16" y2="17.01" />
                  </svg>
                </span>
                <span className="cl-tool-title">Калькулятор зарплат</span>
                <p className="cl-tool-desc">
                  Направление, уровень, город — реальная вилка, медиана и что влияет на цифру.
                </p>
                <span className="cl-tool-cta">Узнать свою вилку →</span>
              </Link>
              <Link href="/research" className="cl-tool-card cl-reveal cl-reveal-d3">
                <span className="cl-tool-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <path d="M7 14l4-4 3 3 5-6" />
                  </svg>
                </span>
                <span className="cl-tool-title">Исследование рынка</span>
                <p className="cl-tool-desc">
                  Интерактивный дашборд: зарплаты стажёров и динамика направлений в 2026.
                </p>
                <span className="cl-tool-cta">Смотреть данные →</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="cl-journey-section" aria-labelledby="cl-journey-title">
          <div className="cl-journey-inner">
            <p className="cl-sec-eyebrow">твой путь</p>
            <h2 id="cl-journey-title" className="cl-sec-title cl-reveal">
              Как получить первый оффер
            </h2>
            <div className="cl-journey-path">
              <div className="cl-journey-step cl-reveal cl-reveal-d1">
                <div className="cl-journey-dot cl-journey-dot--lime">01</div>
                <div className="cl-journey-tag">шаг первый</div>
                <div className="cl-journey-title">Найди вакансию</div>
                <p className="cl-journey-desc">
                  Стажировки и junior: уровень, формат и зарплата — в одном списке на странице
                  вакансий.
                </p>
                <Link className="cl-journey-cta" href="/vacancies">
                  Смотреть вакансии →
                </Link>
              </div>
              <div className="cl-journey-step cl-reveal cl-reveal-d2">
                <div className="cl-journey-dot cl-journey-dot--outline">02</div>
                <div className="cl-journey-tag">шаг второй</div>
                <div className="cl-journey-title">Узнай свою цену</div>
                <p className="cl-journey-desc">
                  Калькулятор покажет вилку и медиану по твоему направлению, уровню и городу.
                </p>
                <Link className="cl-journey-cta" href="/tools/salary-calculator">
                  Рассчитать зарплату →
                </Link>
              </div>
              <div className="cl-journey-step cl-reveal cl-reveal-d3">
                <div className="cl-journey-dot cl-journey-dot--outline">03</div>
                <div className="cl-journey-tag">шаг третий</div>
                <div className="cl-journey-title">Подготовься</div>
                <p className="cl-journey-desc">
                  Резюме, интервью, тестовые задания — короткие гайды с чек-листами, без воды.
                </p>
                <Link className="cl-journey-cta" href="/knowledge-base">
                  Читать статьи →
                </Link>
              </div>
              <div className="cl-journey-step cl-reveal cl-reveal-d4">
                <div className="cl-journey-dot cl-journey-dot--dark" aria-hidden="true">
                  🏆
                </div>
                <div className="cl-journey-tag cl-journey-tag--dark">финал</div>
                <div className="cl-journey-title cl-journey-title--lg">Получи оффер</div>
                <p className="cl-journey-desc">
                  В среднем студенты CareerLab находят первый оффер за 6–8 недель активного поиска.
                </p>
                <span className="cl-journey-badge">6–8 недель</span>
              </div>
            </div>
          </div>
        </section>

        {gridVacancies.length > 0 ? (
          <section className="cl-jobs-section" aria-labelledby="cl-jobs-title">
            <div className="cl-jobs-inner">
              <div className="cl-jobs-header cl-reveal">
                <div>
                  <p className="cl-sec-eyebrow">актуально</p>
                  <h2 id="cl-jobs-title" className="cl-sec-title">
                    Свежие вакансии
                  </h2>
                </div>
                <Link className="cl-jobs-see-all" href="/vacancies">
                  Все вакансии →
                </Link>
              </div>
              <div className="cl-jobs-grid">
                {gridVacancies.map((row, i) => {
                  const d = (i % 3) + 1;
                  const delayClass =
                    d === 1 ? "cl-reveal-d1" : d === 2 ? "cl-reveal-d2" : "cl-reveal-d3";
                  return (
                    <Link
                      key={row.id}
                      href={`/vacancies/${row.slug}`}
                      className={`cl-job-card cl-reveal ${delayClass}`}
                    >
                      <span className="cl-job-co">{row.company}</span>
                      <span className="cl-job-title">{row.title}</span>
                      <span className="cl-job-meta">{jobMeta(row)}</span>
                      <span className="cl-job-salary">
                        {formatJobSalary(row.salary_min, row.salary_max)}
                      </span>
                      <div className="cl-job-footer">
                        {row.featured ? (
                          <span className="cl-pill cl-pill--lime">В топе</span>
                        ) : (
                          <span className="cl-pill cl-pill--outline">{row.exp}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {freshArticles.length > 0 ? (
          <section className="cl-kb-section" aria-labelledby="cl-kb-title">
            <div className="cl-kb-inner">
              <div className="cl-jobs-header cl-reveal">
                <div>
                  <p className="cl-sec-eyebrow">база знаний</p>
                  <h2 id="cl-kb-title" className="cl-sec-title">
                    Подготовься по гайдам
                  </h2>
                </div>
                <Link className="cl-jobs-see-all" href="/knowledge-base">
                  Все статьи →
                </Link>
              </div>
              <div className="cl-kb-grid">
                {freshArticles.map((article, i) => {
                  const d = (i % 4) + 1;
                  const delayClass = `cl-reveal-d${d}`;
                  return (
                    <Link
                      key={article.id}
                      href={`/knowledge-base/${article.slug}`}
                      className={`cl-kb-card cl-reveal ${delayClass}`}
                    >
                      <div className="cl-kb-card-top">
                        <span className="cl-pill cl-pill--outline">{article.category}</span>
                        {article.is_new ? (
                          <span className="cl-pill cl-pill--lime">Новое</span>
                        ) : null}
                      </div>
                      <span className="cl-kb-card-title">{article.title}</span>
                      <p className="cl-kb-card-excerpt">{article.excerpt}</p>
                      <span className="cl-kb-card-meta">{article.read_time} мин чтения</span>
                    </Link>
                  );
                })}
              </div>
              <div className="cl-kb-hubs cl-reveal">
                <span className="cl-kb-hubs-label">Хабы:</span>
                {KNOWLEDGE_CLUSTERS.map((cluster) => (
                  <Link
                    key={cluster.slug}
                    href={`/knowledge-base/${cluster.slug}`}
                    className="cl-kb-hub"
                  >
                    {cluster.category}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="cl-stats-section" aria-labelledby="cl-stats-title">
          <div className="cl-stats-inner">
            <p className="cl-sec-eyebrow">данные рынка</p>
            <h2 id="cl-stats-title" className="cl-sec-title cl-reveal">
              Рынок стажировок 2026
            </h2>
            <div className="cl-stats-kpi cl-reveal">
              <div className="cl-kpi-card">
                <div className="cl-kpi-num">
                  +67%
                  <span className="cl-kpi-badge" aria-hidden="true">
                    ↑
                  </span>
                </div>
                <div className="cl-kpi-label">рост числа стажировок за год</div>
              </div>
              <div className="cl-kpi-card">
                <div className="cl-kpi-num">50 000 ₽</div>
                <div className="cl-kpi-label">медианная зарплата стажёра</div>
              </div>
              <div className="cl-kpi-card">
                <div className="cl-kpi-num">×3</div>
                <div className="cl-kpi-label">рост в банковской сфере</div>
              </div>
            </div>
            <HomeStatsTabs />
            <p className="cl-stats-more cl-reveal">
              <Link href="/research">Полное исследование рынка →</Link>
            </p>
          </div>
        </section>

        <section className="cl-cta-section" aria-labelledby="cl-cta-title">
          <div className="cl-cta-bg1" aria-hidden="true" />
          <div className="cl-cta-bg2" aria-hidden="true" />
          <div className="cl-cta-bg3" aria-hidden="true" />
          <div className="cl-cta-inner cl-reveal">
            <h2 id="cl-cta-title" className="cl-cta-title">
              Кабинет, который
              <br />
              доводит до оффера
            </h2>
            <p className="cl-cta-sub">
              Сохраняйте вакансии, следите за статусами откликов и проходите чек-лист подготовки
              — бесплатно.
            </p>
            <div className="cl-cta-actions">
              <Link className="cl-cta-btn" href="/login">
                Создать аккаунт
              </Link>
              <Link className="cl-cta-btn cl-cta-btn--ghost" href="/vacancies">
                Смотреть вакансии
              </Link>
            </div>
            <p className="cl-cta-b2b">
              Вы компания? <Link href="/for-companies">Разместите вакансию →</Link>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
