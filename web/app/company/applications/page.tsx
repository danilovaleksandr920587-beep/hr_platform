import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyNav } from "@/components/company/CompanyNav";
import { ApplicationsBoard } from "@/components/company/ApplicationsBoard";
import { requireActiveCompany } from "@/lib/company/active-company";
import { listApplicationsForCompany } from "@/lib/company/applications";

export const metadata: Metadata = {
  title: "Отклики",
  robots: { index: false, follow: false },
};

export default async function CompanyApplicationsPage() {
  const { company } = await requireActiveCompany("/company/applications");
  const applications = await listApplicationsForCompany(company.id).catch(() => []);

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 960 }}>
          <CompanyNav companyName={company.name} />
          <h1 className="page-title">Отклики</h1>
          <ApplicationsBoard companyId={company.id} initialApplications={applications} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
