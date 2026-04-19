import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { VacancyCard } from "@/components/VacancyCard";
import { listVacancies } from "@/lib/data/vacancies";

export const metadata: Metadata = {
  title: "Главная",
  description:
    "Стажировки и junior-вакансии, зарплатные ориентиры и гайды к интервью — в одном месте.",
};

export default async function HomePage() {
  const previewVacancies = (await listVacancies({})).slice(0, 3);

  return (
    <>
      <SiteHeader active="/" />
      <main>
        <div className="page-header">
          <div className="page-header-inner">
            <p className="ph-eyebrow">для студентов и выпускников</p>
            <h1 className="ph-title">Всё для первого оффера</h1>
            <form className="ph-search" action="/vacancies" method="get" role="search">
              <label className="visually-hidden" htmlFor="home-q">
                Поиск вакансии
              </label>
              <input
                id="home-q"
                name="q"
                type="search"
                autoComplete="off"
                placeholder="Найти стажировку или junior-вакансию…"
              />
              <button type="submit">Найти</button>
            </form>
          </div>
        </div>

        <section className="section">
          <div className="container">
            <p className="home-strip-muted">Ориентиры</p>
            <div className="home-stats">
              <div className="home-stat">
                <div className="home-stat-num">12 000+</div>
                <div className="home-stat-label">вакансий в базе</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-num">2 400+</div>
                <div className="home-stat-label">стажировок в 2026</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-num">+67%</div>
                <div className="home-stat-label">рост рынка за год</div>
              </div>
            </div>

            <div className="home-logos">
              <div className="home-logos-row">
                <span>Работодатели</span>
                <span>Сбер</span>
                <span>Яндекс</span>
                <span>Т‑Банк</span>
                <span>ВТБ</span>
                <span>МТС</span>
                <span>Авито</span>
                <span>Ozon</span>
              </div>
            </div>

            <p className="ph-eyebrow" style={{ marginBottom: "0.5rem" }}>
              С чего начать
            </p>
            <h2
              className="ph-title"
              style={{ fontSize: "clamp(22px, 3vw, 32px)", marginBottom: "1rem" }}
            >
              Два пути
            </h2>
            <div className="home-links">
              <Link className="home-link-card" href="/vacancies">
                <h2>Вакансии и стажировки</h2>
                <p>
                  Фильтры по сфере, опыту и формату — список с данными на сервере
                  для поисковиков.
                </p>
              </Link>
              <Link className="home-link-card" href="/knowledge-base">
                <h2>База знаний</h2>
                <p>Резюме, отклики, собеседования и переговоры о зарплате.</p>
              </Link>
              <Link className="home-link-card" href="/research">
                <h2>Исследования</h2>
                <p>Ориентиры по рынку и зарплатам.</p>
              </Link>
            </div>

            <p className="ph-eyebrow" style={{ margin: "2.5rem 0 0.5rem" }}>
              Найди своё
            </p>
            <h2
              className="ph-title"
              style={{ fontSize: "clamp(22px, 3vw, 32px)", marginBottom: "0.35rem" }}
            >
              Сценарии под разный старт
            </h2>
            <p className="muted" style={{ maxWidth: "52ch", marginBottom: "0.25rem" }}>
              Выберите ближайший путь — откроется подборка вакансий с подходящими
              фильтрами.
            </p>
            <div className="home-audience-grid">
              <Link className="home-audience-card" href="/vacancies?type=internship&exp=none">
                <div>
                  <div className="home-audience-num">01</div>
                  <h3 className="home-audience-title">Я студент</h3>
                  <p className="home-audience-desc">
                    Стажировка параллельно с учёбой — гибкий формат и оплата.
                  </p>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                className="home-audience-card"
                href="/vacancies?exp=lt1&type=internship"
              >
                <div>
                  <div className="home-audience-num">02</div>
                  <h3 className="home-audience-title">Я выпускник / джун</h3>
                  <p className="home-audience-desc">
                    Первая полноценная роль с зарплатой и ростом внутри команды.
                  </p>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <p className="ph-eyebrow" style={{ margin: "2rem 0 0.5rem" }}>
              Твой путь
            </p>
            <h2
              className="ph-title"
              style={{ fontSize: "clamp(22px, 3vw, 32px)", marginBottom: "1rem" }}
            >
              Как получить первый оффер
            </h2>
            <div className="home-journey">
              <div className="home-journey-step">
                <div className="home-journey-tag">Шаг 1</div>
                <h3>Найди вакансию</h3>
                <p>
                  Стажировки и junior: уровень, формат и зарплата — в одном списке.
                </p>
                <p style={{ marginTop: "0.65rem" }}>
                  <Link className="text-link" href="/vacancies">
                    Смотреть вакансии →
                  </Link>
                </p>
              </div>
              <div className="home-journey-step">
                <div className="home-journey-tag">Шаг 2</div>
                <h3>Узнай свою цену</h3>
                <p>Ориентиры по направлениям — чтобы обсуждать зарплату спокойно.</p>
                <p style={{ marginTop: "0.65rem" }}>
                  <Link className="text-link" href="/research">
                    К исследованиям →
                  </Link>
                </p>
              </div>
              <div className="home-journey-step">
                <div className="home-journey-tag">Шаг 3</div>
                <h3>Подготовься</h3>
                <p>Резюме, интервью, тестовые — короткие гайды с чек-листами.</p>
                <p style={{ marginTop: "0.65rem" }}>
                  <Link className="text-link" href="/knowledge-base">
                    База знаний →
                  </Link>
                </p>
              </div>
            </div>

            <div className="home-preview-head">
              <h2
                className="ph-title"
                style={{ fontSize: "clamp(20px, 2.5vw, 28px)", margin: 0 }}
              >
                Свежие вакансии
              </h2>
              <Link href="/vacancies">Все вакансии →</Link>
            </div>
            {previewVacancies.length === 0 ? (
              <p className="muted" style={{ marginBottom: "2rem" }}>
                Пока нет опубликованных вакансий в Supabase — проверьте таблицу{" "}
                <code>vacancies</code> или фильтр <code>is_published</code>.
              </p>
            ) : (
              <div className="jobs-list" style={{ marginBottom: "2.5rem" }}>
                {previewVacancies.map((row, i) => (
                  <VacancyCard key={row.id} row={row} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
