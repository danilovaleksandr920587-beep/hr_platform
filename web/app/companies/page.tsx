import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyLogo } from "@/components/CompanyLogo";
import { listPublicCompanies } from "@/lib/company/public";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Компании, которые нанимают джунов и стажёров — CareerLab",
  description:
    "Проверенные работодатели, которые берут студентов и начинающих специалистов: профили компаний, открытые стажировки и junior-вакансии на CareerLab.",
  alternates: { canonical: "/companies" },
};

/** Обрезает текст по границе слова, добавляя многоточие. */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

export default async function CompaniesPage() {
  const companies = await listPublicCompanies().catch(() => []);

  return (
    <>
      <main>
        <div className="page-header">
          <div className="page-header-inner">
            <p className="ph-eyebrow">Проверенные работодатели</p>
            <h1 className="ph-title">Компании, где начинают карьеру</h1>
            <p className="fc-hero-sub">
              Каждую компанию здесь мы проверили вручную. Это работодатели, которые
              действительно нанимают студентов и начинающих специалистов: у каждой -
              подтверждённый профиль и открытые вакансии.
            </p>
          </div>
        </div>

        <section className="section">
          <div className="container" style={{ maxWidth: 900 }}>
            {companies.length === 0 ? (
              <p className="company-hint">
                Скоро здесь появятся первые компании. Пока смотрите{" "}
                <Link className="text-link" href="/vacancies">
                  все вакансии
                </Link>
                .
              </p>
            ) : (
              <div className="companies-catalog">
                {companies.map((c) => (
                  <Link
                    key={c.id}
                    href={`/companies/${c.slug}`}
                    className="company-catalog-card"
                  >
                    <CompanyLogo src={c.logo_url} name={c.name} size={52} radius={12} />
                    <div style={{ minWidth: 0 }}>
                      <p className="company-catalog-name">{c.name}</p>
                      <p className="company-catalog-meta">
                        {c.vacancy_count > 0
                          ? `${c.vacancy_count} ${vacancyNoun(c.vacancy_count)}`
                          : "профиль компании"}
                      </p>
                      {c.description ? (
                        <p className="company-catalog-desc">
                          {truncateAtWord(c.description, 110)}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="fc-final-cta" style={{ marginTop: 36 }}>
              <p className="fc-final-cta-title">Ваша компания нанимает начинающих специалистов?</p>
              <p className="fc-final-cta-sub">
                Разместите вакансии и получите страницу компании на CareerLab.
              </p>
              <Link className="fc-btn-lime" href="/for-companies">
                Узнать про размещение
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function vacancyNoun(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return "вакансия";
  if (d10 >= 2 && d10 <= 4 && (d100 < 10 || d100 >= 20)) return "вакансии";
  return "вакансий";
}
