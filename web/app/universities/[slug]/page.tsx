import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { VuzMonogram } from "@/components/vuz/VuzMonogram";
import {
  IconInternship,
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
import "@/styles/vuz-portal.css";

export const revalidate = 600;

/** Продающий блок «что получают студенты вуза» - ценность платформы. */
const STUDENT_BENEFITS = [
  {
    Icon: IconInternship,
    title: "Стажировки и junior-вакансии",
    text: "Проверенные работодатели, которые берут студентов без опыта - в одном каталоге с фильтрами.",
  },
  {
    Icon: IconResume,
    title: "AI-разбор резюме",
    text: "Загрузи резюме - получи балл и конкретные правки, чтобы пройти отбор.",
  },
  {
    Icon: IconKnowledge,
    title: "База знаний",
    text: "Гайды по резюме, собеседованиям и тестовым заданиям - от отклика до оффера.",
  },
  {
    Icon: IconSalary,
    title: "Калькулятор зарплат",
    text: "Реальные вилки по направлению и городу, чтобы идти на переговоры с цифрами.",
  },
];

/** Как студент попадает в систему - 3 шага. */
const STUDENT_STEPS = [
  {
    title: "Выбери свой вуз",
    text: "В личном кабинете отметь вуз - это займёт 10 секунд и подключит тебя к карьерному центру.",
  },
  {
    title: "Получи подборку под себя",
    text: "Платформа подберёт стажировки и junior-вакансии по направлению и уровню.",
  },
  {
    title: "Откликайся и расти",
    text: "Разбор резюме, гайды и трекинг откликов - до первого оффера.",
  },
];

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

export default async function UniversityPage({ params }: PageProps) {
  const { slug } = await params;
  const university = await getPublicUniversityBySlug(slug).catch(() => null);
  // Вузы из сида без контента ЦКС не публикуются (пустая витрина позорит)
  if (!university || !university.description) notFound();

  const stats = await getPublicUniversityStats(university.id).catch(() => null);
  const displayName = university.short_name || university.name;
  const contactEntries = Object.entries(university.contacts ?? {}).filter(
    ([key, value]) => CONTACT_LABELS[key] && typeof value === "string" && value.trim(),
  );

  return (
    <>
      <main>
        <div className="vuz-hero">
          <div className="vuz-hero-inner">
            <VuzMonogram
              src={university.logo_url}
              name={displayName}
              size={100}
              radius={26}
              eager
            />
            <div className="vuz-hero-body">
              <nav className="vuz-hero-crumb" aria-label="Хлебные крошки">
                <Link href="/universities">Вузы-партнёры</Link>
                <span aria-hidden="true">/</span>
                <span>{displayName}</span>
              </nav>
              <span className="vuz-hero-badge">Вуз-партнёр CareerLab</span>
              <h1 className="vuz-hero-title">{university.name}</h1>
              {university.city ? (
                <p className="vuz-hero-city">
                  {[university.city, university.region].filter(Boolean).join(", ")}
                </p>
              ) : null}
              <div className="vuz-hero-chips">
                <span className="vuz-hero-chip">
                  <IconInternship size={16} /> Стажировки и junior-вакансии
                </span>
                <span className="vuz-hero-chip">
                  <IconResume size={16} /> AI-разбор резюме
                </span>
                <span className="vuz-hero-chip">Бесплатно для студентов</span>
              </div>
            </div>
          </div>
        </div>

        <section className="section">
          <div className="container" style={{ maxWidth: 940, display: "flex", flexDirection: "column", gap: 32 }}>
            <div className="panel co-about">
              <p className="co-about-label">Карьерный центр</p>
              <p className="co-about-text">{university.description}</p>
            </div>

            {stats ? (
              <div className="vuz-statband">
                <span className="vuz-statband-num">{stats.student_count}</span>
                <span className="vuz-statband-text">
                  студентов и выпускников {displayName} уже ищут стажировки и первую
                  работу на CareerLab
                </span>
              </div>
            ) : null}

            <div>
              <p className="vuz-section-eyebrow">Для студентов</p>
              <h2 className="vuz-section-title">Что даёт CareerLab студентам {displayName}</h2>
              <div className="vuz-benefits">
                {STUDENT_BENEFITS.map(({ Icon, title, text }) => (
                  <div key={title} className="vuz-benefit">
                    <div className="vuz-benefit-icon">
                      <Icon size={24} />
                    </div>
                    <p className="vuz-benefit-title">{title}</p>
                    <p className="vuz-benefit-text">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="vuz-section-eyebrow">Как это работает</p>
              <h2 className="vuz-section-title">Три шага до первой работы</h2>
              <div className="vuz-steps">
                {STUDENT_STEPS.map((s, i) => (
                  <div key={s.title} className="vuz-step">
                    <div className="vuz-step-num">{i + 1}</div>
                    <p className="vuz-step-title">{s.title}</p>
                    <p className="vuz-step-text">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

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

            <div className="vuz-cta">
              <p className="vuz-cta-title">Учишься в {displayName}?</p>
              <p className="vuz-cta-text">
                Выбери свой вуз в личном кабинете - попадёшь в карьерную аналитику
                центра и получишь персональную подборку стажировок.
              </p>
              <div className="vuz-cta-actions">
                <Link className="vuz-btn-primary" href="/office">
                  Выбрать вуз в кабинете <IconArrow size={18} />
                </Link>
                <Link className="vuz-btn-ghost" href="/vacancies">
                  Смотреть вакансии
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
