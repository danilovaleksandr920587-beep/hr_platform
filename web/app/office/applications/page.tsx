import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { MyApplications, type MyApplication } from "@/components/office/MyApplications";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listApplicationsForAccount } from "@/lib/company/applications";
import { listVacancies, listVacanciesBySlugs } from "@/lib/data/vacancies";

export const metadata: Metadata = {
  title: "Мои отклики",
  robots: { index: false, follow: false },
};

export default async function OfficeApplicationsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/office/applications");

  const applications = await listApplicationsForAccount(session.id).catch(() => []);
  const vacancies = await listVacanciesBySlugs(applications.map((a) => a.vacancy_slug)).catch(
    () => [],
  );
  const bySlug = new Map(vacancies.map((v) => [v.slug, v] as const));

  // Для пустого состояния: свежие вакансии вместо голой заглушки
  const suggestions = applications.length === 0
    ? await listVacancies({ limit: 3, fields: "card" }).catch(() => [])
    : [];

  const items: MyApplication[] = applications.map((a) => {
    const v = bySlug.get(a.vacancy_slug);
    return {
      id: a.id,
      vacancy_slug: a.vacancy_slug,
      vacancy_title: v?.title ?? a.vacancy_slug,
      company_name: v?.company ?? "",
      status: a.status,
      status_note: a.status_note,
      created_at: a.created_at,
    };
  });

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <p style={{ marginBottom: 6 }}>
            <Link className="text-link" href="/office">
              ← Личный кабинет
            </Link>
          </p>
          <h1 className="page-title">Мои отклики</h1>
          <MyApplications
            initial={items}
            suggestions={suggestions.map((v) => ({
              slug: v.slug,
              title: v.title,
              company: v.company,
              city: v.city ?? null,
            }))}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
