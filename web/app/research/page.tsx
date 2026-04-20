import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Исследования",
  description:
    "Ориентиры по junior и стажировкам — чтобы обсуждать компенсацию спокойно.",
};

export default function ResearchPage() {
  return (
    <>
      <main>
        <section className="section">
          <div className="container">
            <article className="panel panel-lime">
              <h1 className="page-title">
                Зарплаты и рынок: смотрите на цифры перед разговором
              </h1>
              <p className="hero-text">
                Ориентиры по junior и стажировкам — чтобы обсуждать компенсацию
                спокойно и не продешевить. Здесь будет интерактивный срез данных;
                пока используйте вакансии и базу знаний как источник правды.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-coral" href="/vacancies">
                  К вакансиям
                </Link>
                <Link className="btn btn-light" href="/knowledge-base">
                  Как читать такие данные
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <p className="home-strip-muted">Пока в разработке</p>
            <h2 className="page-title" style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)" }}>
              Что смотреть вместо интерактивных графиков
            </h2>
            <div className="home-links" style={{ marginTop: "1rem" }}>
              <Link className="home-link-card" href="/vacancies">
                <h2>Медианы по вакансиям</h2>
                <p>
                  Фильтруйте по сфере и уровню — в карточках видны вилки зарплат из
                  базы.
                </p>
              </Link>
              <Link className="home-link-card" href="/knowledge-base">
                <h2>Гайды по переговорам</h2>
                <p>Раздел «Зарплата» в базе знаний — как называть диапазон и что сравнивать в оффере.</p>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
