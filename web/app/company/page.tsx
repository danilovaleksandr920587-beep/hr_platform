import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyNav } from "@/components/company/CompanyNav";
import { requireActiveCompany } from "@/lib/company/active-company";
import { listCompanyVacancies } from "@/lib/company/vacancies";
import { listApplicationsForCompany } from "@/lib/company/applications";
import { COMPANY_STATUS_LABELS } from "@/lib/company/constants";

export const metadata: Metadata = {
  title: "Кабинет компании",
  robots: { index: false, follow: false },
};

export default async function CompanyDashboardPage() {
  const { company } = await requireActiveCompany("/company");

  const [vacancies, applications] = await Promise.all([
    listCompanyVacancies(company.id).catch(() => []),
    listApplicationsForCompany(company.id).catch(() => []),
  ]);

  const published = vacancies.filter((v) => v.status === "published").length;
  const pending = vacancies.filter((v) => v.status === "pending_review").length;
  const drafts = vacancies.filter((v) => v.status === "draft" || v.status === "rejected").length;
  const newApplications = applications.filter((a) => a.status === "new").length;

  const statusBanner =
    company.status === "pending" ? (
      <div className="panel" style={{ marginBottom: 20, borderLeft: "4px solid #e5a500" }}>
        <p style={{ margin: 0 }}>
          <strong>Компания на проверке.</strong> Вы уже можете готовить вакансии в черновиках -
          отправка на публикацию откроется после подтверждения. Обычно проверка занимает 1 рабочий день.
        </p>
      </div>
    ) : company.status === "rejected" ? (
      <div className="panel" style={{ marginBottom: 20, borderLeft: "4px solid #c0392b" }}>
        <p style={{ margin: 0 }}>
          <strong>Компания не прошла проверку.</strong>
          {company.status_reason ? ` Причина: ${company.status_reason}.` : ""}{" "}
          Обновите данные в <Link className="text-link" href="/company/settings">настройках</Link> и
          напишите в поддержку.
        </p>
      </div>
    ) : company.status === "blocked" ? (
      <div className="panel" style={{ marginBottom: 20, borderLeft: "4px solid #c0392b" }}>
        <p style={{ margin: 0 }}>
          <strong>Компания заблокирована.</strong> Свяжитесь с поддержкой платформы.
        </p>
      </div>
    ) : null;

  const cardStyle = {
    flex: "1 1 180px",
    padding: "1rem 1.2rem",
    borderRadius: 14,
    border: "1px solid var(--border2, #ddd)",
    textDecoration: "none",
    color: "inherit",
    display: "block" as const,
  };

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 960 }}>
          <CompanyNav companyName={company.name} />
          <h1 className="page-title">Обзор</h1>
          <p className="hero-text" style={{ marginBottom: 16 }}>
            Статус компании: <strong>{COMPANY_STATUS_LABELS[company.status]}</strong>
          </p>
          {statusBanner}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link href="/company/applications?status=new" style={cardStyle}>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{newApplications}</div>
              <div>Новых откликов</div>
            </Link>
            <Link href="/company/vacancies" style={cardStyle}>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{published}</div>
              <div>Опубликовано вакансий</div>
            </Link>
            <Link href="/company/vacancies" style={cardStyle}>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{pending}</div>
              <div>На модерации</div>
            </Link>
            <Link href="/company/vacancies" style={cardStyle}>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{drafts}</div>
              <div>Черновики и отклонённые</div>
            </Link>
          </div>
          <p style={{ marginTop: 24 }}>
            <Link className="text-link" href="/company/vacancies/new">
              + Новая вакансия
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
