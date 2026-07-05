import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyNav } from "@/components/company/CompanyNav";
import { CompanySettingsForm } from "@/components/company/CompanySettingsForm";
import { requireActiveCompany } from "@/lib/company/active-company";
import { COMPANY_STATUS_LABELS } from "@/lib/company/constants";

export const metadata: Metadata = {
  title: "Настройки компании",
  robots: { index: false, follow: false },
};

export default async function CompanySettingsPage() {
  const { company } = await requireActiveCompany("/company/settings");

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <CompanyNav companyName={company.name} />
          <h1 className="page-title">Настройки</h1>
          <p className="hero-text" style={{ marginBottom: 16 }}>
            Статус: <strong>{COMPANY_STATUS_LABELS[company.status]}</strong>
            {company.status === "rejected" && company.status_reason
              ? ` (${company.status_reason})`
              : ""}
          </p>
          <CompanySettingsForm
            companyId={company.id}
            isOwner={company.role === "owner"}
            initial={{
              name: company.name,
              inn: company.inn ?? "",
              website: company.website ?? "",
              description: company.description ?? "",
            }}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
