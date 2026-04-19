import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Исследования",
  description:
    "Ориентиры по junior и стажировкам — чтобы обсуждать компенсацию спокойно.",
};

export default function ResearchPage() {
  return (
    <>
      <SiteHeader active="/research" />
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
      </main>
      <SiteFooter />
    </>
  );
}
