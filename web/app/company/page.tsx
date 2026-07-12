import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyNav } from "@/components/company/CompanyNav";
import { requireActiveCompany } from "@/lib/company/active-company";
import { listCompanyVacancies } from "@/lib/company/vacancies";
import { listApplicationsForCompany } from "@/lib/company/applications";
import { COMPANY_STATUS_LABELS } from "@/lib/company/constants";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Кабинет компании",
  robots: { index: false, follow: false },
};

export default async function CompanyDashboardPage() {
  const { company, companies } = await requireActiveCompany("/company");

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
      <div className="panel company-banner company-banner--warn">
        <p>
          <strong>Компания на проверке.</strong> Вы уже можете готовить вакансии в черновиках -
          отправка на публикацию откроется после подтверждения. Обычно проверка занимает 1 рабочий день.
        </p>
      </div>
    ) : company.status === "rejected" ? (
      <div className="panel company-banner company-banner--error">
        <p>
          <strong>Компания не прошла проверку.</strong>
          {company.status_reason ? ` Причина: ${company.status_reason}.` : ""}{" "}
          Обновите данные в <Link className="text-link" href="/company/settings">настройках</Link> и
          напишите в <a className="text-link" href={`mailto:${SUPPORT_EMAIL}`}>поддержку</a>.
        </p>
      </div>
    ) : company.status === "blocked" ? (
      <div className="panel company-banner company-banner--error">
        <p>
          <strong>Компания заблокирована.</strong> Свяжитесь с{" "}
          <a className="text-link" href={`mailto:${SUPPORT_EMAIL}`}>поддержкой платформы</a>.
        </p>
      </div>
    ) : null;

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 960 }}>
          <CompanyNav companyName={company.name} companies={companies.map((c) => ({ id: c.id, name: c.name }))} activeId={company.id} />
          <h1 className="page-title">Обзор</h1>
          <p className="hero-text" style={{ marginBottom: 16 }}>
            Статус компании: <strong>{COMPANY_STATUS_LABELS[company.status]}</strong>
          </p>
          {statusBanner}
          <div className="company-stats">
            <Link href="/company/applications?status=new" className="company-stat">
              <div className="company-stat-num">{newApplications}</div>
              <div className="company-stat-label">Новых откликов</div>
            </Link>
            <Link href="/company/vacancies" className="company-stat">
              <div className="company-stat-num">{published}</div>
              <div className="company-stat-label">Опубликовано вакансий</div>
            </Link>
            <Link href="/company/vacancies" className="company-stat">
              <div className="company-stat-num">{pending}</div>
              <div className="company-stat-label">На модерации</div>
            </Link>
            <Link href="/company/vacancies" className="company-stat">
              <div className="company-stat-num">{drafts}</div>
              <div className="company-stat-label">Черновики и отклонённые</div>
            </Link>
          </div>
          <p style={{ marginTop: 24 }}>
            <Link className="btn-dark" href="/company/vacancies/new">
              + Новая вакансия
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
