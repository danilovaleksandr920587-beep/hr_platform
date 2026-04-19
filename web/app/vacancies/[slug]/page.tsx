import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getVacancyBySlug } from "@/lib/data/vacancies";
import { buildVacancyStaticParams } from "@/lib/data/vacancy-static-paths";

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

const expLabels: Record<string, string> = {
  none: "Без опыта",
  lt1: "До 1 года",
  "1-3": "1–3 года",
  gte3: "От 3 лет",
};
const formatLabels: Record<string, string> = {
  remote: "Удалённо",
  hybrid: "Гибрид",
  office: "Офис",
};
const typeLabels: Record<string, string> = {
  internship: "Стажировка",
  project: "Проектная работа",
  parttime: "Подработка",
};

export default async function VacancyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const row = await getVacancyBySlug(slug);
  if (!row) notFound();

  const salaryMissing = row.salary_min == null || row.salary_max == null;
  const pay = salaryMissing
    ? "Зарплата не указана"
    : `${row.salary_min!.toLocaleString("ru-RU")} — ${row.salary_max!.toLocaleString("ru-RU")} ₽`;

  return (
    <>
      <SiteHeader active="/vacancies" />
      <main>
        <section className="section">
          <div className="container">
            <article className="panel">
              <Link className="text-link" href="/vacancies">
                ← К списку вакансий
              </Link>
              <h1 className="page-title" style={{ marginTop: "0.4rem" }}>
                {row.title}
              </h1>
              <p className="hero-text">{row.company}</p>
              <p className="vacancy-card-pay">{pay}</p>
              <div className="chips chips-spaced" aria-label="Условия">
                <span className="chip">{expLabels[row.exp] ?? row.exp}</span>
                <span className="chip">{typeLabels[row.type] ?? row.type}</span>
                <span className="chip">{formatLabels[row.format] ?? row.format}</span>
              </div>
              {row.description ? (
                <p className="muted" style={{ lineHeight: 1.65 }}>
                  {row.description}
                </p>
              ) : null}
              <div className="hero-actions">
                <Link className="btn btn-coral" href="/office">
                  Откликнуться
                </Link>
                <Link className="btn btn-light" href="/vacancies">
                  Вернуться к поиску
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
