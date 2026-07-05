import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { ApplyForm } from "@/components/vacancies/ApplyForm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getVacancyBySlug, getVacancyApplyMode } from "@/lib/data/vacancies";
import { hasApplied } from "@/lib/company/applications";

export const metadata: Metadata = {
  title: "Отклик на вакансию",
  robots: { index: false, follow: false },
};

// Форма всегда свежая: статус вакансии и наличие отклика проверяем на каждый запрос
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export default async function VacancyApplyPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getSessionFromCookies();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/vacancies/${slug}/apply`)}`);
  }

  const [vacancy, applyMode] = await Promise.all([
    getVacancyBySlug(slug),
    getVacancyApplyMode(slug),
  ]);
  if (!vacancy) notFound();

  const alreadyApplied = await hasApplied(slug, session.id).catch(() => false);
  const closed = applyMode !== "internal" || (vacancy.is_archived ?? false);

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <p style={{ marginBottom: 6 }}>
            <Link className="text-link" href={`/vacancies/${slug}`}>
              ← К вакансии
            </Link>
          </p>
          <h1 className="page-title">Отклик: {vacancy.title}</h1>
          <p className="hero-text" style={{ marginBottom: 20 }}>
            {vacancy.company}
            {vacancy.city ? ` · ${vacancy.city}` : ""}
          </p>

          {closed ? (
            <div className="panel">
              <p style={{ margin: 0 }}>
                Эта вакансия не принимает отклики на платформе.{" "}
                <Link className="text-link" href={`/vacancies/${slug}`}>
                  Вернуться к вакансии
                </Link>
              </p>
            </div>
          ) : alreadyApplied ? (
            <div className="panel">
              <p style={{ margin: "0 0 10px" }}>
                Вы уже откликались на эту вакансию. Статус - в разделе{" "}
                <Link className="text-link" href="/office/applications">
                  мои отклики
                </Link>
                .
              </p>
            </div>
          ) : (
            <ApplyForm slug={slug} vacancyTitle={vacancy.title} />
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
