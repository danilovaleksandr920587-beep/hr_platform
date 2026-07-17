import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { VuzMonogram } from "@/components/vuz/VuzMonogram";
import { IconArrow } from "@/components/vuz/VuzIcons";
import { listPublicUniversities } from "@/lib/university/public";
import "@/styles/vuz-portal.css";

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
              <div className="vuz-catalog">
                {universities.map((u) => (
                  <Link
                    key={u.id}
                    href={`/universities/${u.slug}`}
                    className="vuz-card"
                  >
                    <div className="vuz-card-top">
                      <VuzMonogram
                        src={u.logo_url}
                        name={u.short_name || u.name}
                        size={56}
                        radius={14}
                      />
                      <div style={{ minWidth: 0 }}>
                        <p className="vuz-card-name">{u.short_name || u.name}</p>
                        {u.city ? (
                          <span className="vuz-card-city">
                            {[u.city, u.region].filter(Boolean).join(", ")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {u.description ? (
                      <p className="vuz-card-desc">{truncateAtWord(u.description, 150)}</p>
                    ) : null}
                    <div className="vuz-card-foot">
                      <span className="vuz-card-tag">Карьерный центр</span>
                      <span className="vuz-card-open">
                        Открыть <IconArrow size={16} />
                      </span>
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
