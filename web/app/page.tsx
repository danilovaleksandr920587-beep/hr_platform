import type { Metadata } from "next";
import Link from "next/link";
import { HomeClRevealInit } from "@/components/home/HomeClRevealInit";
import { HomeStatsTabs } from "@/components/home/HomeStatsTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { listVacancies } from "@/lib/data/vacancies";
import type { VacancyRow } from "@/lib/types";
import "@/styles/home-redesign.css";

export const metadata: Metadata = {
  title: "Главная",
  description:
    "Стажировки и junior-вакансии, зарплатные ориентиры и гайды к интервью — в одном месте.",
};

function formatJobSalary(min: number | null, max: number | null): string {
  const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)} ₽`;
  if (max != null) return `до ${fmt(max)} ₽`;
  if (min != null) return `от ${fmt(min)} ₽`;
  return "По согласованию";
}

function jobMeta(row: VacancyRow): string {
  return [row.format, row.type].filter(Boolean).join(" · ");
}

export default async function HomePage() {
  const previewVacancies = (await listVacancies({})).slice(0, 3);

  return (
    <div className="home-careerlab-scope">
      <HomeClRevealInit />

      <main>
        <section className="cl-hero" aria-labelledby="cl-hero-title">
          <div className="cl-hero-blob" aria-hidden="true" />
          <div className="cl-hero-blob2" aria-hidden="true" />

          <Link href="/vacancies" className="cl-hero-float">
            <div className="cl-hf-label">Свежие стажировки</div>
            <div className="cl-hf-row">
              <div>
                <div className="cl-hf-job">Frontend-стажёр</div>
                <div className="cl-hf-meta">Orbit Tech · Удалённо</div>
              </div>
              <span className="cl-hf-tag cl-hf-tag--lime">45–55 тыс</span>
            </div>
            <div className="cl-hf-row">
              <div>
                <div className="cl-hf-job">Продуктовый аналитик</div>
                <div className="cl-hf-meta">Nova Bank · Гибрид</div>
              </div>
              <span className="cl-hf-tag cl-hf-tag--gray">80–100 тыс</span>
            </div>
            <div className="cl-hf-row">
              <div>
                <div className="cl-hf-job">Data Engineer</div>
                <div className="cl-hf-meta">Stream Analytics · Офис</div>
              </div>
              <span className="cl-hf-tag cl-hf-tag--gray">120–150 тыс</span>
            </div>
          </Link>

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
            <div className="cl-hero-stat">
              <div className="cl-hero-stat-num">12 000+</div>
              <div className="cl-hero-stat-label">вакансий в базе</div>
            </div>
            <div className="cl-hero-stat">
              <div className="cl-hero-stat-num">2 400+</div>
              <div className="cl-hero-stat-label">стажировок в 2026</div>
            </div>
            <div className="cl-hero-stat">
              <div className="cl-hero-stat-num">+67%</div>
              <div className="cl-hero-stat-label">рост рынка за год</div>
            </div>
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

        <section className="cl-audience-section" aria-labelledby="cl-aud-title">
          <div className="cl-audience-inner">
            <div className="cl-audience-left cl-reveal">
              <p className="cl-sec-eyebrow">с чего начать</p>
              <h2 id="cl-aud-title" className="cl-sec-title">
                Найди своё
              </h2>
              <p className="cl-audience-desc">
                Два пути к первому офферу — выбери сценарий и переходи к подборке вакансий и
                материалам.
              </p>
            </div>
            <div className="cl-audience-right">
              <Link href="/vacancies" className="cl-aud-card cl-reveal cl-reveal-d1">
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
              <Link href="/vacancies" className="cl-aud-card cl-reveal cl-reveal-d2">
                <div>
                  <div className="cl-aud-card-num">02</div>
                  <div className="cl-aud-card-title">Я выпускник / джун</div>
                  <div className="cl-aud-card-desc">
                    Уже есть база, хочу первую полноценную работу с нормальной зарплатой и ростом.
                  </div>
                  <div className="cl-aud-pills">
                    <span className="cl-pill cl-pill--lime">Junior-позиции</span>
                    <span className="cl-pill cl-pill--outline">Полная занятость</span>
                    <span className="cl-pill cl-pill--outline">От 80 тыс ₽</span>
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
              <Link
                href="/vacancies"
                className="cl-bento-card cl-bento-card--large cl-bento-card--featured"
              >
                <span className="cl-bento-icon" aria-hidden="true">
                  💻
                </span>
                <span className="cl-bento-name">IT и разработка</span>
                <span className="cl-bento-count">4 200 вакансий</span>
                <span className="cl-bento-num">01</span>
              </Link>
              <Link href="/vacancies" className="cl-bento-card">
                <span className="cl-bento-icon" aria-hidden="true">
                  📊
                </span>
                <span className="cl-bento-name">Аналитика</span>
                <span className="cl-bento-count">1 800 вакансий</span>
                <span className="cl-bento-num">02</span>
              </Link>
              <Link href="/vacancies" className="cl-bento-card">
                <span className="cl-bento-icon" aria-hidden="true">
                  🏦
                </span>
                <span className="cl-bento-name">Финансы</span>
                <span className="cl-bento-count">1 400 вакансий</span>
                <span className="cl-bento-num">03</span>
              </Link>
              <Link href="/vacancies" className="cl-bento-card">
                <span className="cl-bento-icon" aria-hidden="true">
                  📣
                </span>
                <span className="cl-bento-name">Маркетинг</span>
                <span className="cl-bento-count">980 вакансий</span>
                <span className="cl-bento-num">04</span>
              </Link>
              <Link href="/vacancies" className="cl-bento-card">
                <span className="cl-bento-icon" aria-hidden="true">
                  ⚙️
                </span>
                <span className="cl-bento-name">Инженерия</span>
                <span className="cl-bento-count">890 вакансий</span>
                <span className="cl-bento-num">05</span>
              </Link>
              <Link href="/vacancies" className="cl-bento-card">
                <span className="cl-bento-icon" aria-hidden="true">
                  🧪
                </span>
                <span className="cl-bento-name">QA / тестирование</span>
                <span className="cl-bento-count">760 вакансий</span>
                <span className="cl-bento-num">06</span>
              </Link>
              <Link href="/vacancies" className="cl-bento-card">
                <span className="cl-bento-icon" aria-hidden="true">
                  🎨
                </span>
                <span className="cl-bento-name">Дизайн</span>
                <span className="cl-bento-count">520 вакансий</span>
                <span className="cl-bento-num">07</span>
              </Link>
              <Link href="/vacancies" className="cl-bento-card">
                <span className="cl-bento-icon" aria-hidden="true">
                  📋
                </span>
                <span className="cl-bento-name">Менеджмент</span>
                <span className="cl-bento-count">640 вакансий</span>
                <span className="cl-bento-num">08</span>
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
                  Медианы по направлениям — чтобы называть цифру уверенно и не продешевить.
                </p>
                <Link className="cl-journey-cta" href="/research">
                  Смотреть зарплаты →
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
              {previewVacancies.length === 0 ? (
                <>
                  <Link href="/vacancies" className="cl-job-card cl-reveal cl-reveal-d1">
                    <span className="cl-job-co">Nova Bank</span>
                    <span className="cl-job-title">Младший продуктовый аналитик</span>
                    <span className="cl-job-meta">Гибрид · Стажировка</span>
                    <span className="cl-job-salary">80–100 000 ₽</span>
                    <div className="cl-job-footer">
                      <span className="cl-pill cl-pill--outline">Ментор внутри</span>
                    </div>
                  </Link>
                  <Link href="/vacancies" className="cl-job-card cl-reveal cl-reveal-d2">
                    <span className="cl-job-co">Orbit Tech</span>
                    <span className="cl-job-title">Стажёр Frontend (React)</span>
                    <span className="cl-job-meta">Удалённо · Оплачивается</span>
                    <span className="cl-job-salary">45–55 000 ₽</span>
                    <div className="cl-job-footer">
                      <span className="cl-pill cl-pill--lime">Без опыта</span>
                    </div>
                  </Link>
                  <Link href="/vacancies" className="cl-job-card cl-reveal cl-reveal-d3">
                    <span className="cl-job-co">Stream Analytics</span>
                    <span className="cl-job-title">Data Engineer (проект)</span>
                    <span className="cl-job-meta">Офис · 3 мес.</span>
                    <span className="cl-job-salary">120–150 000 ₽</span>
                    <div className="cl-job-footer">
                      <span className="cl-pill cl-pill--outline">От 3 лет</span>
                    </div>
                  </Link>
                </>
              ) : (
                previewVacancies.map((row, i) => {
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
                })
              )}
            </div>
          </div>
        </section>

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
          </div>
        </section>

        <section className="cl-trust-section" aria-labelledby="cl-trust-title">
          <div className="cl-trust-inner">
            <div className="cl-trust-left cl-reveal">
              <p className="cl-sec-eyebrow">истории</p>
              <h2 id="cl-trust-title" className="cl-sec-title">
                Уже нашли
              </h2>
              <p>Реальные студенты, реальные результаты — без приукрашиваний.</p>
            </div>
            <div className="cl-trust-cards">
              <blockquote className="cl-trust-card cl-reveal cl-reveal-d1">
                <p className="cl-trust-quote">
                  Нашла стажировку в Т‑Банке через 3 недели. Использовала зарплатный ориентир — и
                  не продешевила.
                </p>
                <footer className="cl-trust-person">
                  <span className="cl-trust-av cl-trust-av--lime">МС</span>
                  <span>
                    <span className="cl-trust-name">Маша Смирнова</span>
                    <br />
                    <span className="cl-trust-role">3 курс ВШЭ · Продакт-стажёр</span>
                  </span>
                </footer>
              </blockquote>
              <blockquote className="cl-trust-card cl-reveal cl-reveal-d2">
                <p className="cl-trust-quote">
                  Отправил резюме по гайду с чек-листом — позвали на интервью с первого отклика.
                  Оффер получил через месяц.
                </p>
                <footer className="cl-trust-person">
                  <span className="cl-trust-av cl-trust-av--blue">АК</span>
                  <span>
                    <span className="cl-trust-name">Артём Козлов</span>
                    <br />
                    <span className="cl-trust-role">Выпускник · Junior Backend</span>
                  </span>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        <section className="cl-cta-section" aria-labelledby="cl-cta-title">
          <div className="cl-cta-bg1" aria-hidden="true" />
          <div className="cl-cta-bg2" aria-hidden="true" />
          <div className="cl-cta-bg3" aria-hidden="true" />
          <div className="cl-cta-inner cl-reveal">
            <h2 id="cl-cta-title" className="cl-cta-title">
              Начните с одной
              <br />
              вакансии
            </h2>
            <p className="cl-cta-sub">
              Студенты находят первый оффер в среднем за 6–8 недель активного поиска
            </p>
            <Link className="cl-cta-btn" href="/vacancies">
              Смотреть вакансии →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
