import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyNav } from "@/components/company/CompanyNav";
import { VacancyForm } from "@/components/company/VacancyForm";
import { VacancyStatusBadge } from "@/components/company/VacancyStatusBadge";
import { ApplicationsBoard } from "@/components/company/ApplicationsBoard";
import { requireActiveCompany } from "@/lib/company/active-company";
import { getCompanyVacancyBySlug } from "@/lib/company/vacancies";
import { listApplicationsForCompany } from "@/lib/company/applications";

export const metadata: Metadata = {
  title: "Редактирование вакансии",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ slug: string }> };

export default async function CompanyVacancyEditPage({ params }: PageProps) {
  const { slug } = await params;
  const { company, companies } = await requireActiveCompany(`/company/vacancies/${slug}`);

  const vacancy = await getCompanyVacancyBySlug(company.id, slug).catch(() => null);
  if (!vacancy) notFound();

  const applications = await listApplicationsForCompany(company.id, { vacancySlug: slug }).catch(
    () => [],
  );

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <CompanyNav companyName={company.name} companies={companies.map((c) => ({ id: c.id, name: c.name }))} activeId={company.id} />
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h1 className="page-title" style={{ margin: 0 }}>{vacancy.title}</h1>
            <VacancyStatusBadge status={vacancy.status} />
          </div>
          {vacancy.status === "rejected" && vacancy.status_reason && (
            <div className="panel" style={{ margin: "16px 0", borderLeft: "4px solid #c0392b" }}>
              <p style={{ margin: 0 }}>
                <strong>Не прошла модерацию.</strong> Причина: {vacancy.status_reason}. Исправьте и
                отправьте снова.
              </p>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <VacancyForm
              companyId={company.id}
              slug={vacancy.slug}
              status={vacancy.status}
              companyVerified={company.status === "verified"}
              initial={{
                title: vacancy.title,
                description: vacancy.description ?? "",
                sphere: vacancy.sphere,
                exp: vacancy.exp,
                format: vacancy.format,
                type: vacancy.type,
                salaryMin: vacancy.salary_min != null ? String(vacancy.salary_min) : "",
                salaryMax: vacancy.salary_max != null ? String(vacancy.salary_max) : "",
                city: vacancy.city ?? "",
                skills: (vacancy.skills ?? []).join(", "),
                applyMode: vacancy.apply_mode,
                applyUrl: vacancy.apply_url ?? "",
              }}
            />
          </div>

          <h2 style={{ marginTop: 36 }}>Отклики на эту вакансию ({applications.length})</h2>
          <ApplicationsBoard
            companyId={company.id}
            initialApplications={applications}
            showVacancyColumn={false}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
