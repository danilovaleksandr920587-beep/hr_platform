import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { VacancyCard } from "@/components/VacancyCard";
import { VuzMonogram } from "@/components/vuz/VuzMonogram";
import { KpiCard, BenchmarkBars } from "@/components/vuz/VuzCharts";
import {
  IconResume,
  IconKnowledge,
  IconSalary,
  IconArrow,
} from "@/components/vuz/VuzIcons";
import {
  getPublicUniversityBySlug,
  getPublicUniversityStats,
  listPublicUniversitySlugs,
} from "@/lib/university/public";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listVacancies } from "@/lib/data/vacancies";
import { salaryBand, getDirection } from "@/lib/data/salary";
import { vacancyDescriptionPreview } from "@/lib/vacancy-preview";
import "@/styles/vuz-portal.css";

export const revalidate = 600;

/** Направления для зарплатного тизера (junior, Москва). */
const SALARY_PICKS = ["backend", "analyst", "frontend"] as const;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const slugs = await listPublicUniversitySlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const university = await getPublicUniversityBySlug(slug).catch(() => null);
  if (!university || !university.description) return { title: "Вуз не найден" };

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const displayName = university.short_name || university.name;
  const description =
    university.description.slice(0, 155) ||
    `Карьерный центр ${displayName}: стажировки и первая работа для студентов на CareerLab.`;

  return {
    title: `Карьерный центр ${displayName} - стажировки и работа для студентов`,
    description,
    alternates: { canonical: `${base}/universities/${university.slug}` },
    openGraph: {
      title: `Карьерный центр ${displayName}`,
      description,
    },
  };
}

/** Известные ключи contacts jsonb -> подпись. Прочие ключи не рендерим. */
const CONTACT_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Телефон",
  telegram: "Telegram",
  website: "Сайт",
  address: "Адрес",
};

function contactHref(key: string, value: string): string | null {
  if (key === "email") return `mailto:${value}`;
  if (key === "phone") return `tel:${value.replace(/[^+\d]/g, "")}`;
  if (key === "telegram")
    return value.startsWith("http") ? value : `https://t.me/${value.replace(/^@/, "")}`;
  if (key === "website") return value.startsWith("http") ? value : `https://${value}`;
  return null;
}

function formatRub(thousands: number): string {
  return `${(thousands * 1000).toLocaleString("ru-RU")} ₽`;
}

export default async function UniversityPage({ params }: PageProps) {
  const { slug } = await params;
  const university = await getPublicUniversityBySlug(slug).catch(() => null);
  // Вузы из сида без контента ЦКС не публикуются (пустая витрина позорит)
  if (!university || !university.description) notFound();

  const displayName = university.short_name || university.name;
  const cityLine = [university.city, university.region].filter(Boolean).join(", ");

  const [stats, session, allVac] = await Promise.all([
    getPublicUniversityStats(university.id).catch(() => null),
    getSessionFromCookies(),
    listVacancies({ fields: "card" }).catch(() => []),
  ]);

  const vacCount = allVac.length;
  const vacancyCards = allVac.slice(0, 3).map((row) => ({
    row: {
      ...row,
      description: null,
      description_blocks: null,
      search_document: null,
      company_about: null,
    },
    preview: vacancyDescriptionPreview(row.description, row.description_blocks),
  }));

  const salaryTiles = SALARY_PICKS.map((key) => {
    const dir = getDirection(key);
    const band = salaryBand(key, "junior", "moscow");
    return { name: dir.name, band, trend: Math.round(dir.trend * 100) };
  });

  const contactEntries = Object.entries(university.contacts ?? {}).filter(
    ([key, value]) => CONTACT_LABELS[key] && typeof value === "string" && value.trim(),
  );

  const statCards: { num: string; label: string }[] = [
    { num: `${vacCount}`, label: "стажировок и junior-вакансий открыто сейчас" },
    { num: "70+", label: "карьерных гайдов приводят студентов из поиска" },
    stats
      ? { num: `${stats.student_count}`, label: `студентов ${displayName} уже на платформе` }
      : { num: "0 ₽", label: "стоимость для студентов и вуза - бесплатно" },
  ];

  return (
    <>
      <main>
        {/* 1. Hero - лаймовый, в стиле сайта */}
        <div className="page-header fc-hero">
          <div className="page-header-inner">
            <div className="vuz-hero-row">
              <div style={{ minWidth: 0 }}>
                <p className="ph-eyebrow">Вуз-партнёр CareerLab</p>
                <h1 className="ph-title">{university.name}</h1>
                <p className="fc-hero-sub">
                  {cityLine ? `${cityLine}. ` : ""}Карьерный центр на CareerLab:
                  стажировки, AI-разбор резюме и база знаний для студентов
                  и выпускников {displayName}.
                </p>
                <div className="fc-hero-actions">
                  <Link className="fc-btn-dark" href="/office">
                    Выбрать свой вуз
                  </Link>
                  <Link className="fc-btn-ghost" href="/vacancies">
                    Смотреть стажировки
                  </Link>
                </div>
              </div>
              <VuzMonogram
                src={university.logo_url}
                name={displayName}
                size={132}
                radius={30}
                eager
                className="vuz-hero-mono"
              />
            </div>
          </div>
        </div>

        {/* 2. Полоса цифр */}
        <div className="fc-stats" aria-label="CareerLab в цифрах">
          {statCards.map((s) => (
            <div key={s.label} className="fc-stat">
              <div className="fc-stat-num">{s.num}</div>
              <div className="fc-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <section className="section">
          <div className="container" style={{ maxWidth: 1040, display: "flex", flexDirection: "column", gap: 40 }}>
            {/* О карьерном центре */}
            <div className="panel co-about">
              <p className="co-about-label">Карьерный центр</p>
              <p className="co-about-text">{university.description}</p>
            </div>

            {/* 3. Живые стажировки - главный крючок */}
            {vacancyCards.length > 0 ? (
              <div>
                <p className="vuz-eyebrow">Прямо сейчас</p>
                <h2 className="fc-sec-title" style={{ marginTop: 0 }}>
                  Стажировки, на которые можно откликнуться
                </h2>
                <div className="jobs-list">
                  {vacancyCards.map(({ row, preview }, i) => (
                    <VacancyCard
                      key={row.id}
                      row={row}
                      index={i}
                      viewerScope={session?.id ?? null}
                      descriptionPreview={preview}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 16 }}>
                  <Link className="fc-btn-outline" href="/vacancies">
                    Смотреть все вакансии
                  </Link>
                </div>
              </div>
            ) : null}

            {/* 4. Зарплатный тизер */}
            <div>
              <p className="vuz-eyebrow">Сколько платят новичкам</p>
              <h2 className="fc-sec-title" style={{ marginTop: 0 }}>
                Зарплаты junior в 2026
              </h2>
              <div className="vuz-salary-grid">
                {salaryTiles.map((t) => (
                  <div key={t.name} className="vuz-salary-card">
                    <p className="vuz-salary-name">{t.name}</p>
                    <p className="vuz-salary-band">
                      {formatRub(t.band.low)} – {formatRub(t.band.high)}
                    </p>
                    <div className="vuz-salary-meta">
                      <span>junior · Москва</span>
                      <span className="vuz-salary-trend">
                        <IconSalary size={13} /> +{t.trend}%/год
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <Link className="fc-btn-outline" href="/tools/salary-calculator">
                  Посчитать свою зарплату
                </Link>
              </div>
            </div>

            {/* 5. Сервисы - bento */}
            <div>
              <p className="vuz-eyebrow">Что даёт CareerLab</p>
              <h2 className="fc-sec-title" style={{ marginTop: 0 }}>
                Сервисы для студентов {displayName}
              </h2>
              <div className="vuz-bento">
                <div className="vuz-cell vuz-cell--dark">
                  <div className="vuz-icon-tile">
                    <IconResume size={24} />
                  </div>
                  <p className="vuz-cell-title" style={{ color: "#fff" }}>
                    AI-разбор резюме
                  </p>
                  <p className="vuz-cell-text">
                    Загрузи резюме - за минуту получи балл и конкретные правки под
                    вакансию, чтобы пройти отбор.
                  </p>
                  <div className="vuz-resume" aria-hidden>
                    <div className="vuz-resume-score">
                      <span className="vuz-resume-num">
                        78<span>/100</span>
                      </span>
                    </div>
                    <ul className="vuz-resume-list">
                      <li>
                        <span className="vuz-resume-dot" style={{ background: "#b5db2a" }} />
                        Добавь метрики к проектам
                      </li>
                      <li>
                        <span className="vuz-resume-dot" style={{ background: "#f3b21c" }} />
                        Укажи стек в шапке
                      </li>
                      <li>
                        <span className="vuz-resume-dot" style={{ background: "#e0562f" }} />
                        Слишком длинное - сократи до 1 страницы
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="vuz-bento-col">
                  <div className="vuz-cell">
                    <div className="vuz-icon-tile">
                      <IconKnowledge size={24} />
                    </div>
                    <p className="vuz-cell-title">База знаний</p>
                    <p className="vuz-cell-text">
                      70+ гайдов: резюме, собеседования, тестовые - от отклика
                      до оффера.
                    </p>
                  </div>
                  <div className="vuz-cell">
                    <div className="vuz-icon-tile">
                      <IconSalary size={24} />
                    </div>
                    <p className="vuz-cell-title">Калькулятор зарплат</p>
                    <p className="vuz-cell-text">
                      Реальные вилки по направлению и городу - чтобы идти
                      на переговоры с цифрами.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Для карьерного центра - вторая аудитория */}
            <div className="vuz-cc">
              <div className="vuz-cc-grid">
                <div>
                  <p className="vuz-cc-eyebrow">Карьерному центру {displayName}</p>
                  <h2 className="vuz-cc-title">
                    Кабинет с живой аналитикой по вашим студентам
                  </h2>
                  <ul className="vuz-cc-list">
                    <li>
                      <IconArrow size={18} /> Сколько студентов ищут работу, что
                      смотрят, как откликаются
                    </li>
                    <li>
                      <IconArrow size={18} /> Воронка до приглашения и сравнение
                      со средним по платформе
                    </li>
                    <li>
                      <IconArrow size={18} /> Всё обезличенно - без слежки за
                      конкретными студентами
                    </li>
                  </ul>
                  <Link className="fc-btn-lime" href="/vuz-demo">
                    Открыть демо кабинета
                  </Link>
                </div>
                <div className="vuz-cc-card">
                  <div className="vuz-cc-kpis">
                    <KpiCard
                      label="Студентов"
                      value={342}
                      sub="+48 за 30 дней"
                      spark={[3, 5, 4, 8, 11, 9, 14, 18]}
                    />
                    <KpiCard
                      label="Откликов, 30 дней"
                      value={176}
                      spark={[12, 18, 15, 27, 31, 29, 44, 52]}
                      accent={false}
                    />
                  </div>
                  <BenchmarkBars
                    items={[
                      {
                        label: "Откликов на студента за 30 дней",
                        vuzValue: 0.5,
                        platformValue: 0.4,
                        deltaPct: 28,
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Контакты ЦКС */}
            {contactEntries.length > 0 ? (
              <div className="panel">
                <p className="co-about-label">Контакты карьерного центра</p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 14 }}>
                  {contactEntries.map(([key, value]) => {
                    const href = contactHref(key, value);
                    return (
                      <li key={key} style={{ margin: "6px 0" }}>
                        <span style={{ opacity: 0.65 }}>{CONTACT_LABELS[key]}: </span>
                        {href ? (
                          <a
                            className="text-link"
                            href={href}
                            target={key === "email" || key === "phone" ? undefined : "_blank"}
                            rel="noopener noreferrer nofollow"
                          >
                            {value}
                          </a>
                        ) : (
                          <span>{value}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
