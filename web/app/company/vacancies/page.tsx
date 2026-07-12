import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyNav } from "@/components/company/CompanyNav";
import { VacancyStatusBadge } from "@/components/company/VacancyStatusBadge";
import { requireActiveCompany } from "@/lib/company/active-company";
import { listCompanyVacancies } from "@/lib/company/vacancies";
import { getVacancyStats } from "@/lib/company/stats";

export const metadata: Metadata = {
  title: "Вакансии компании",
  robots: { index: false, follow: false },
};

export default async function CompanyVacanciesPage() {
  const { company, companies } = await requireActiveCompany("/company/vacancies");
  const vacancies = await listCompanyVacancies(company.id).catch(() => []);
  const stats = await getVacancyStats(vacancies.map((v) => v.slug)).catch(() => new Map());

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 960 }}>
          <CompanyNav companyName={company.name} companies={companies.map((c) => ({ id: c.id, name: c.name }))} activeId={company.id} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 className="page-title" style={{ margin: 0 }}>Вакансии</h1>
            <Link className="btn-dark" href="/company/vacancies/new">
              + Новая вакансия
            </Link>
          </div>

          {!vacancies.length ? (
            <div className="panel" style={{ marginTop: 20 }}>
              <p style={{ margin: 0 }}>
                Пока нет вакансий. Создайте первую - черновик можно готовить, даже пока компания на
                проверке.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
              {vacancies.map((v) => (
                <div
                  key={v.slug}
                  className="panel"
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}
                >
                  <div>
                    <p style={{ margin: "0 0 4px", fontWeight: 600 }}>
                      <Link className="text-link" href={`/company/vacancies/${v.slug}`}>
                        {v.title}
                      </Link>
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #666)" }}>
                      {v.city || "Локация не указана"}
                      {v.status === "rejected" && v.status_reason ? ` · Причина отклонения: ${v.status_reason}` : ""}
                    </p>
                    {v.status === "published" ? (
                      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--dark, #111)", fontWeight: 600 }}>
                        {(stats.get(v.slug)?.views ?? 0).toLocaleString("ru-RU")} просмотров
                        {" · "}
                        {(stats.get(v.slug)?.apply_clicks ?? 0).toLocaleString("ru-RU")} переходов «Откликнуться»
                      </p>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <VacancyStatusBadge status={v.status} />
                    {v.status === "published" && (
                      <Link className="text-link" href={`/vacancies/${v.slug}`} target="_blank">
                        Открыть
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
