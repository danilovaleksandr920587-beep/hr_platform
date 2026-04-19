import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Главная",
  description:
    "Стажировки и junior-вакансии, зарплатные ориентиры и гайды к интервью — в одном месте.",
};

export default function HomePage() {
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
                  Фильтры по сфере, опыту и формату работы — список рендерится на
                  сервере для поисковиков.
                </p>
              </Link>
              <Link className="home-link-card" href="/knowledge-base">
                <h2>База знаний</h2>
                <p>Резюме, отклики, собеседования и переговоры о зарплате.</p>
              </Link>
              <Link className="home-link-card" href="/research">
                <h2>Исследования</h2>
                <p>Ориентиры по рынку и зарплатам — краткий срез данных.</p>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
