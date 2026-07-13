import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { VacancyCard } from "@/components/VacancyCard";
import { CompanyLogo } from "@/components/CompanyLogo";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getPublicCompanyBySlug, listPublicCompanySlugs } from "@/lib/company/public";
import { listVacanciesByCompanyId } from "@/lib/data/vacancies";
import { vacancyDescriptionPreview } from "@/lib/vacancy-preview";

export const revalidate = 600;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const slugs = await listPublicCompanySlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const company = await getPublicCompanyBySlug(slug).catch(() => null);
  if (!company) return { title: "Компания не найдена" };

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const description =
    company.description?.slice(0, 155) ||
    `${company.name}: вакансии и стажировки для студентов и джунов на CareerLab.`;

  return {
    title: `Работа и стажировки в ${company.name}`,
    description,
    alternates: { canonical: `${base}/companies/${company.slug}` },
    openGraph: {
      title: `Работа и стажировки в ${company.name}`,
      description,
    },
  };
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params;
  const company = await getPublicCompanyBySlug(slug).catch(() => null);
  if (!company) notFound();

  const [session, vacancies] = await Promise.all([
    getSessionFromCookies(),
    listVacanciesByCompanyId(company.id).catch(() => []),
  ]);

  const cards = vacancies.map((row) => ({
    row: {
      ...row,
      description: null,
      description_blocks: null,
      search_document: null,
      company_about: null,
    },
    preview: vacancyDescriptionPreview(row.description, row.description_blocks),
  }));

  const websiteLabel = company.website
    ? company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : null;

  return (
    <>
      <main>
        <div className="page-header co-hero">
          <div className="page-header-inner">
            <nav className="co-breadcrumb" aria-label="Хлебные крошки">
              <Link href="/companies">Работодатели</Link>
              <span aria-hidden="true">/</span>
              <span>{company.name}</span>
            </nav>
            <div className="co-hero-row">
              <CompanyLogo
                src={company.logo_url}
                name={company.name}
                size={84}
                radius={20}
                className="co-hero-logo"
                eager
              />
              <div style={{ minWidth: 0 }}>
                <span className="company-verified-badge">Проверенный работодатель</span>
                <h1 className="ph-title co-hero-title">{company.name}</h1>
                {websiteLabel ? (
                  <a
                    className="co-site-pill"
                    href={company.website as string}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {websiteLabel} ↗
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <section className="section">
          <div className="container" style={{ maxWidth: 900 }}>
            {company.description ? (
              <div className="panel co-about">
                <p className="co-about-label">О компании</p>
                <p className="co-about-text">{company.description}</p>
              </div>
            ) : null}

            <div className="co-vacancies-head">
              <h2 className="co-vacancies-title">Открытые вакансии</h2>
              <span className="co-vacancies-count">{cards.length}</span>
            </div>
            {cards.length === 0 ? (
              <div className="panel company-empty">
                <p className="company-empty-title">Пока нет открытых вакансий</p>
                <p className="company-empty-text">
                  Эта компания сейчас не набирает. В общем каталоге - свежие
                  стажировки и junior-позиции от проверенных работодателей.
                </p>
                <Link className="btn-outline" href="/vacancies">
                  Смотреть все вакансии
                </Link>
              </div>
            ) : (
              <div className="jobs-list">
                {cards.map(({ row, preview }, i) => (
                  <VacancyCard
                    key={row.id}
                    row={row}
                    index={i}
                    viewerScope={session?.id ?? null}
                    descriptionPreview={preview}
                  />
                ))}
              </div>
            )}

            <div className="panel" style={{ marginTop: 28, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 14 }}>
                Готовитесь к отклику?{" "}
                <Link className="text-link" href="/knowledge-base">
                  База знаний
                </Link>{" "}
                и{" "}
                <Link className="text-link" href="/tools/resume-analyzer">
                  AI-разбор резюме
                </Link>{" "}
                помогут пройти отбор.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
