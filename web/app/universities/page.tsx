import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyLogo } from "@/components/CompanyLogo";
import { listPublicUniversities } from "@/lib/university/public";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Вузы-партнёры CareerLab - карьерные центры для студентов",
  description:
    "Карьерные центры вузов-партнёров CareerLab: стажировки, первая работа и карьерные сервисы для студентов и выпускников.",
  alternates: { canonical: "/universities" },
};

/** Обрезает текст по границе слова, добавляя многоточие. */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

export default async function UniversitiesPage() {
  const universities = await listPublicUniversities().catch(() => []);

  return (
    <>
      <main>
        <div className="page-header">
          <div className="page-header-inner">
            <p className="ph-eyebrow">Вузы-партнёры</p>
            <h1 className="ph-title">Карьерные центры вузов на CareerLab</h1>
            <p className="fc-hero-sub">
              Вузы, чьи карьерные центры работают со студентами на платформе:
              стажировки, junior-вакансии и карьерные сервисы для студентов
              и выпускников.
            </p>
          </div>
        </div>

        <section className="section">
          <div className="container" style={{ maxWidth: 900 }}>
            {universities.length === 0 ? (
              <p className="company-hint">
                Скоро здесь появятся первые вузы-партнёры. Студентам уже сейчас
                доступны{" "}
                <Link className="text-link" href="/vacancies">
                  стажировки и junior-вакансии
                </Link>
                .
              </p>
            ) : (
              <div className="companies-catalog">
                {universities.map((u) => (
                  <Link
                    key={u.id}
                    href={`/universities/${u.slug}`}
                    className="company-catalog-card"
                  >
                    <CompanyLogo
                      src={u.logo_url}
                      name={u.short_name || u.name}
                      size={52}
                      radius={12}
                    />
                    <div style={{ minWidth: 0 }}>
                      <p className="company-catalog-name">{u.short_name || u.name}</p>
                      <p className="company-catalog-meta">
                        {[u.city, u.region].filter(Boolean).join(", ") || "вуз-партнёр"}
                      </p>
                      {u.description ? (
                        <p className="company-catalog-desc">
                          {truncateAtWord(u.description, 110)}
                        </p>
                      ) : null}
                    </div>
                  </Link>
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
