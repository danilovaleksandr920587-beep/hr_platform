import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { VuzMonogram } from "@/components/vuz/VuzMonogram";
import { PrintButton } from "@/components/vuz/PrintButton";
import {
  FunnelChart,
  DonutChart,
  BarList,
  BenchmarkBars,
  TrendChart,
} from "@/components/vuz/VuzCharts";
import { getActiveUniversity } from "@/lib/university/active-university";
import { getUniversityDashboard } from "@/lib/university/stats";
import { UNIVERSITY_STATS_MIN_GROUP } from "@/lib/university/constants";
import "@/styles/vuz-portal.css";

export const metadata: Metadata = {
  title: "Отчёт карьерного центра",
  robots: { index: false, follow: false },
};

export default async function VuzReportPage() {
  const context = await getActiveUniversity("/vuz/report");
  if (!context) redirect("/vuz");

  const { university } = context;
  const d = await getUniversityDashboard(university.id);
  const displayName = university.short_name || university.name;
  const dateLabel = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const kpis = [
    { num: d.studentCount, label: "студентов на платформе" },
    { num: d.studentsNew30d, label: "новых за 30 дней" },
    { num: d.activity30d.applications, label: "откликов за 30 дней" },
    { num: d.activity30d.savedVacancies, label: "сохранённых вакансий" },
    { num: d.activity30d.resumeAnalyses, label: "AI-разборов резюме" },
  ];

  const funnelSteps = [
    { label: "Выбрали вуз в профиле", value: d.funnel.declared },
    { label: "Прошли AI-разбор резюме", value: d.funnel.withResumeAnalysis },
    { label: "Откликнулись на вакансии", value: d.funnel.applied },
    { label: "Получили приглашение", value: d.funnel.invited },
  ];

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="vuz-report-actions">
            <Link className="text-link" href="/vuz">
              ← Назад в кабинет
            </Link>
            <PrintButton className="btn-dark">Печать / Сохранить в PDF</PrintButton>
          </div>

          <article className="vuz-report">
            <header className="vuz-report-head">
              <VuzMonogram
                src={university.logo_url}
                name={displayName}
                size={64}
                radius={16}
                eager
              />
              <div style={{ minWidth: 0 }}>
                <h1 className="vuz-report-title">
                  Карьерный отчёт {displayName}
                </h1>
                <p className="vuz-report-sub">
                  CareerLab · {[university.city, university.region].filter(Boolean)[0] ?? ""}
                  {" · "}
                  на {dateLabel}
                </p>
              </div>
            </header>

            {d.belowThreshold ? (
              <div className="panel company-banner company-banner--warn" style={{ marginBottom: 24 }}>
                <p style={{ margin: 0 }}>
                  Данных пока недостаточно для полной аналитики: вуз выбрали{" "}
                  {d.studentCount} из минимум {UNIVERSITY_STATS_MIN_GROUP} студентов.
                  Отчёт показывает доступные показатели.
                </p>
              </div>
            ) : null}

            <section className="vuz-report-section">
              <p className="vuz-report-h">Ключевые показатели</p>
              <div className="vuz-report-kpis">
                {kpis.map((k) => (
                  <div key={k.label} className="vuz-report-kpi">
                    <div className="vuz-report-kpi-num">
                      {k.num.toLocaleString("ru-RU")}
                    </div>
                    <div className="vuz-report-kpi-label">{k.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {!d.belowThreshold ? (
              <>
                <section className="vuz-report-section">
                  <p className="vuz-report-h">Воронка студентов</p>
                  <FunnelChart steps={funnelSteps} />
                </section>

                {d.trend.length > 1 ? (
                  <section className="vuz-report-section">
                    <p className="vuz-report-h">Динамика по неделям</p>
                    <TrendChart
                      labels={d.trend.map((t) => t.label)}
                      series={[
                        { name: "Отклики", color: "#c9f135", points: d.trend.map((t) => t.applications), fill: true },
                        { name: "Новые студенты", color: "#1e2114", points: d.trend.map((t) => t.students) },
                      ]}
                    />
                  </section>
                ) : null}

                {(d.byStudyYear.length > 0 || d.topDirections.length > 0) ? (
                  <section className="vuz-report-section">
                    <div className="vuz-report-grid2">
                      {d.byStudyYear.length > 0 ? (
                        <div>
                          <p className="vuz-report-h">По курсам</p>
                          <DonutChart
                            segments={d.byStudyYear.map((r) => ({
                              label: `${r.study_year} курс`,
                              value: r.count,
                            }))}
                            centerLabel="студентов"
                          />
                        </div>
                      ) : null}
                      {d.topDirections.length > 0 ? (
                        <div>
                          <p className="vuz-report-h">Топ-направления</p>
                          <BarList
                            items={d.topDirections.map((r) => ({ label: r.label, value: r.count }))}
                          />
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {d.benchmark && d.benchmark.length > 0 ? (
                  <section className="vuz-report-section">
                    <p className="vuz-report-h">Сравнение со средним по платформе</p>
                    <BenchmarkBars items={d.benchmark} />
                  </section>
                ) : null}
              </>
            ) : null}

            <p className="vuz-report-foot">
              Сформировано на CareerLab · {dateLabel} · lab-career.ru. Все данные
              обезличены: платформа не раскрывает вузу студентов поимённо.
            </p>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
