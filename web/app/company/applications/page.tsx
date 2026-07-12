import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyNav } from "@/components/company/CompanyNav";
import { ApplicationsBoard } from "@/components/company/ApplicationsBoard";
import { requireActiveCompany } from "@/lib/company/active-company";
import { listApplicationsForCompany } from "@/lib/company/applications";
import { listCompanyVacancies } from "@/lib/company/vacancies";

export const metadata: Metadata = {
  title: "Отклики",
  robots: { index: false, follow: false },
};

export default async function CompanyApplicationsPage() {
  const { company, companies } = await requireActiveCompany("/company/applications");
  const [applications, vacancies] = await Promise.all([
    listApplicationsForCompany(company.id).catch(() => []),
    listCompanyVacancies(company.id).catch(() => []),
  ]);
  // Отклики лежат в Postgres, вакансии - в Supabase: название протягиваем join-ом здесь
  const titleBySlug = new Map(vacancies.map((v) => [v.slug, v.title]));
  const board = applications.map((a) => ({
    ...a,
    vacancy_title: titleBySlug.get(a.vacancy_slug) ?? a.vacancy_slug,
  }));

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 960 }}>
          <CompanyNav companyName={company.name} companies={companies.map((c) => ({ id: c.id, name: c.name }))} activeId={company.id} />
          <h1 className="page-title">Отклики</h1>
          <ApplicationsBoard companyId={company.id} initialApplications={board} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
