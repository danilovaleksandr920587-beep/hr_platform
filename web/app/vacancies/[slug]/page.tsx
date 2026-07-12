import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { VacancyDetailClient } from "@/components/vacancies/VacancyDetailClient";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getVacancyApplyMode, getVacancyBySlug, listVacancies, listVacanciesByCompanyId } from "@/lib/data/vacancies";
import { getPublicCompanyById } from "@/lib/company/public";
import { buildVacancyStaticParams } from "@/lib/data/vacancy-static-paths";
import { EXP_LABELS, FORMAT_LABELS, SPHERE_LABELS, TYPE_LABELS } from "@/lib/vacancy-labels";
import "@/styles/vacancy-detail-ref.css";

export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return buildVacancyStaticParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await getVacancyBySlug(slug);
  if (!row) return { title: "Вакансия не найдена" };

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const isArchived = row.is_archived ?? false;

  const salaryPart =
    row.salary_min != null || row.salary_max != null
      ? `. Зарплата: ${
          row.salary_min && row.salary_max
            ? `от ${row.salary_min.toLocaleString("ru-RU")} до ${row.salary_max.toLocaleString("ru-RU")} ₽`
            : row.salary_min
              ? `от ${row.salary_min.toLocaleString("ru-RU")} ₽`
              : `до ${row.salary_max!.toLocaleString("ru-RU")} ₽`
        }`
      : "";
  const cityPart = row.city ? ` в ${row.city}` : "";
  const description = isArchived
    ? `Вакансия закрыта. ${row.description?.slice(0, 130) ?? `${row.title} в ${row.company}${cityPart}${salaryPart}.`}`
    : (row.description ??
        `${row.title} в ${row.company}${cityPart}${salaryPart}. Откликнись на CareerLab.`);

  const titleBase = isArchived
    ? `[Архив] ${row.title} — ${row.company}`
    : row.title;

  return {
    title: titleBase,
    description,
    alternates: { canonical: `${base}/vacancies/${row.slug}` },
    robots: {
      index: true,   // архивные страницы остаются в индексе
      follow: true,
    },
    openGraph: {
      title: titleBase,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: titleBase,
      description,
    },
  };
}


function fmtMoney(n: number) {
  return n.toLocaleString("ru-RU");
}

function salaryMain(min: number | null, max: number | null) {
  if (min != null && max != null) return `${fmtMoney(min)} — ${fmtMoney(max)} ₽`;
  if (min != null) return `от ${fmtMoney(min)} ₽`;
  if (max != null) return `до ${fmtMoney(max)} ₽`;
  return "Не указана";
}

function salaryCompact(min: number | null, max: number | null) {
  if (min != null && max != null) return `${Math.round(min / 1000)} — ${Math.round(max / 1000)} тыс ₽`;
  if (min != null) return `от ${Math.round(min / 1000)} тыс ₽`;
  if (max != null) return `до ${Math.round(max / 1000)} тыс ₽`;
  return "Не указана";
}

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  internship: "INTERN",
  parttime: "PART_TIME",
  project: "CONTRACTOR",
  fulltime: "FULL_TIME",
};

export default async function VacancyDetailPage({ params }: PageProps) {
  const session = await getSessionFromCookies();
  const { slug } = await params;
  const row = await getVacancyBySlug(slug);
  if (!row) notFound();
  const applyMode = await getVacancyApplyMode(slug);

  const isArchived = row.is_archived ?? false;

  // Блок «О работодателе» - только для вакансий verified-компаний из кабинета.
  const companyProfile = row.company_id
    ? await getPublicCompanyById(row.company_id).catch(() => null)
    : null;
  const companyOtherVacancies = companyProfile
    ? (await listVacanciesByCompanyId(companyProfile.id, 4).catch(() => []))
        .filter((v) => v.slug !== row.slug)
        .slice(0, 3)
    : [];

  // Похожие — только из активных вакансий (is_archived=false применяется в listVacancies)
  const similarRows = (
    await listVacancies({ sphere: [row.sphere], fields: "card", limit: 8 })
  )
    .filter((x) => x.slug !== row.slug)
    .slice(0, 4)
    .map((x) => {
      const tLabel = TYPE_LABELS[x.type] ?? x.type;
      const typeClass =
        x.type === "internship"
          ? "kvref-jtag-type-intern"
          : x.type === "project"
            ? "kvref-jtag-type-project"
            : "kvref-jtag-type-junior";
      return {
        slug: x.slug,
        company: x.company,
        title: x.title,
        salaryText: salaryCompact(x.salary_min, x.salary_max),
        typeLabel: tLabel,
        typeClass,
      };
    });

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const vacancyUrl = `${base}/vacancies/${row.slug}`;

  const jobPostingJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: row.title,
    description: row.description ?? `${row.title} в ${row.company}`,
    datePosted: row.source_published_at ?? row.published_at,
    ...(isArchived ? { validThrough: row.published_at } : {}),
    hiringOrganization: {
      "@type": "Organization",
      name: row.company,
      ...(row.company_logo_url ? { logo: row.company_logo_url } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: row.city ?? "Россия",
        addressCountry: "RU",
      },
    },
    employmentType: EMPLOYMENT_TYPE_MAP[row.type] ?? "OTHER",
    url: vacancyUrl,
  };

  if (row.salary_min != null || row.salary_max != null) {
    jobPostingJsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "RUB",
      value: {
        "@type": "QuantitativeValue",
        ...(row.salary_min != null ? { minValue: row.salary_min } : {}),
        ...(row.salary_max != null ? { maxValue: row.salary_max } : {}),
        unitText: "MONTH",
      },
    };
  }

  if (row.format === "remote") {
    jobPostingJsonLd.jobLocationType = "TELECOMMUTE";
  }

  if (row.apply_url) {
    jobPostingJsonLd.directApply = false;
    jobPostingJsonLd.url = row.apply_url;
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Вакансии", item: `${base}/vacancies` },
      { "@type": "ListItem", position: 3, name: row.title, item: vacancyUrl },
    ],
  };

  return (
    <>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <VacancyDetailClient
          viewerScope={session?.id ?? null}
          companyProfile={
            companyProfile
              ? {
                  slug: companyProfile.slug,
                  name: companyProfile.name,
                  otherVacancies: companyOtherVacancies.map((v) => ({
                    slug: v.slug,
                    title: v.title,
                  })),
                }
              : null
          }
          slug={row.slug}
          title={row.title}
          company={row.company}
          companyAbout={row.company_about}
          companyLogoUrl={row.company_logo_url}
          city={row.city}
          skills={row.skills}
          sphere={row.sphere}
          sphereLabel={SPHERE_LABELS[row.sphere] ?? row.sphere}
          salaryMain={salaryMain(row.salary_min, row.salary_max)}
          salaryCompact={salaryCompact(row.salary_min, row.salary_max)}
          salaryNote={
            row.salary_min != null || row.salary_max != null
              ? "ежемесячно"
              : "зарплата не указана в источнике"
          }
          expLabel={EXP_LABELS[row.exp] ?? row.exp}
          typeLabel={TYPE_LABELS[row.type] ?? row.type}
          formatLabel={FORMAT_LABELS[row.format] ?? row.format}
          description={row.description}
          descriptionBlocks={row.description_blocks}
          featured={row.featured}
          publishedAt={row.published_at}
          sourcePublishedAt={row.source_published_at}
          applyUrl={row.apply_url}
          applyMode={applyMode}
          similar={similarRows}
          isArchived={isArchived}
        />
      </main>
      <SiteFooter />
    </>
  );
}
