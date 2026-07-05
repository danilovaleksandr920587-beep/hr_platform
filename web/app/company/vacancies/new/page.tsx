import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyNav } from "@/components/company/CompanyNav";
import { VacancyForm } from "@/components/company/VacancyForm";
import { requireActiveCompany } from "@/lib/company/active-company";

export const metadata: Metadata = {
  title: "Новая вакансия",
  robots: { index: false, follow: false },
};

export default async function CompanyVacancyNewPage() {
  const { company, companies } = await requireActiveCompany("/company/vacancies/new");

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <CompanyNav companyName={company.name} companies={companies.map((c) => ({ id: c.id, name: c.name }))} activeId={company.id} />
          <h1 className="page-title">Новая вакансия</h1>
          <p className="hero-text" style={{ marginBottom: 20 }}>
            Сначала сохраняется черновик - его можно доработать и отправить на публикацию.
          </p>
          <VacancyForm companyId={company.id} companyVerified={company.status === "verified"} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
