import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyLogo } from "@/components/CompanyLogo";
import {
  getPublicUniversityBySlug,
  getPublicUniversityStats,
  listPublicUniversitySlugs,
} from "@/lib/university/public";

export const revalidate = 600;

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
        <div className="page-header co-hero">
          <div className="page-header-inner">
            <nav className="co-breadcrumb" aria-label="Хлебные крошки">
              <Link href="/">Главная</Link>
              <span aria-hidden="true">/</span>
              <span>{displayName}</span>
            </nav>
            <div className="co-hero-row">
              <CompanyLogo
                src={university.logo_url}
                name={displayName}
                size={84}
                radius={20}
                className="co-hero-logo"
                eager
              />
              <div style={{ minWidth: 0 }}>
                <span className="company-verified-badge">Вуз-партнёр CareerLab</span>
                <h1 className="ph-title co-hero-title">{university.name}</h1>
                {university.city ? (
                  <p style={{ margin: "6px 0 0", fontSize: 14, opacity: 0.75 }}>
                    {[university.city, university.region].filter(Boolean).join(", ")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <section className="section">
          <div className="container" style={{ maxWidth: 900 }}>
            <div className="panel co-about">
              <p className="co-about-label">Карьерный центр</p>
              <p className="co-about-text">{university.description}</p>
            </div>

            {stats ? (
              <div className="panel" style={{ marginTop: 20 }}>
                <p className="co-about-label">Студенты на CareerLab</p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
                  {stats.student_count}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.7 }}>
                  студентов и выпускников {displayName} ищут стажировки и первую
                  работу на платформе
                </p>
              </div>
            ) : null}

            {contactEntries.length > 0 ? (
              <div className="panel" style={{ marginTop: 20 }}>
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

            <div className="panel" style={{ marginTop: 28, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 14 }}>
                Учишься в {displayName}? Выбери свой вуз в{" "}
                <Link className="text-link" href="/office">
                  личном кабинете
                </Link>{" "}
                - и смотри{" "}
                <Link className="text-link" href="/vacancies">
                  стажировки и junior-вакансии
                </Link>{" "}
                от проверенных работодателей.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
