import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { VacancyDetailClient } from "@/components/vacancies/VacancyDetailClient";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getVacancyBySlug, listVacancies } from "@/lib/data/vacancies";
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
  return {
    title: row.title,
    description: row.description ?? `${row.company} · ${row.title}`,
    openGraph: {
      title: row.title,
      description: row.description ?? undefined,
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

export default async function VacancyDetailPage({ params }: PageProps) {
  const session = await getSessionFromCookies();
  const { slug } = await params;
  const row = await getVacancyBySlug(slug);
  if (!row) notFound();

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

  return (
    <>
      <main>
        <VacancyDetailClient
          viewerScope={session?.id ?? null}
          slug={row.slug}
          title={row.title}
          company={row.company}
          companyAbout={row.company_about}
          companyLogoUrl={row.company_logo_url}
          city={row.city}
          skills={row.skills}
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
          similar={similarRows}
        />
      </main>
      <SiteFooter />
    </>
  );
}
