import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { VuzNav } from "@/components/vuz/VuzNav";
import { getActiveUniversity } from "@/lib/university/active-university";
import { getUniversityDashboard } from "@/lib/university/stats";
import { UNIVERSITY_STATS_MIN_GROUP } from "@/lib/university/constants";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Кабинет вуза",
  robots: { index: false, follow: false },
};

export default async function VuzDashboardPage() {
  const context = await getActiveUniversity("/vuz");

  if (!context) {
    return (
      <>
        <main className="section">
          <div className="container" style={{ maxWidth: 640 }}>
            <div className="panel">
              <h1 className="page-title">Кабинет вуза</h1>
              <p className="hero-text">
                Доступ к кабинету карьерного центра выдаётся по приглашению.
                Если ваш вуз ещё не на CareerLab - напишите нам на{" "}
                <a className="text-link" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                , расскажем про пилот.
              </p>
              <p className="hero-text">
                <Link className="text-link" href="/office">
                  Личный кабинет
                </Link>
              </p>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const { university } = context;
  const d = await getUniversityDashboard(university.id);
  const displayName = university.short_name || university.name;

  const funnelRows = [
    { label: "Выбрали вуз в профиле", value: d.funnel.declared },
    { label: "Прошли AI-разбор резюме", value: d.funnel.withResumeAnalysis },
    { label: "Откликнулись на вакансии", value: d.funnel.applied },
    { label: "Получили приглашение", value: d.funnel.invited },
  ];

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 900 }}>
          <VuzNav universityName={displayName} />

          {d.belowThreshold ? (
            <div className="panel company-banner company-banner--warn">
              <p>
                <strong>Данные накапливаются.</strong> Пока вуз выбрали{" "}
                {d.studentCount} из минимум {UNIVERSITY_STATS_MIN_GROUP} студентов -
                агрегаты откроются, когда студентов станет больше. Быстрее всего
                работает рассылка по студентам со ссылкой на платформу: тексты
                дадим, напишите в{" "}
                <a className="text-link" href={`mailto:${SUPPORT_EMAIL}`}>поддержку</a>.
              </p>
            </div>
          ) : null}

          <div className="company-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
            <div className="panel">
              <p className="co-about-label">Студентов на платформе</p>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>{d.studentCount}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.65 }}>
                +{d.studentsNew30d} за 30 дней
              </p>
            </div>
            <div className="panel">
              <p className="co-about-label">Откликов за 30 дней</p>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
                {d.activity30d.applications}
              </p>
            </div>
            <div className="panel">
              <p className="co-about-label">Сохранённых вакансий</p>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
                {d.activity30d.savedVacancies}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.65 }}>за 30 дней</p>
            </div>
            <div className="panel">
              <p className="co-about-label">AI-разборов резюме</p>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>
                {d.activity30d.resumeAnalyses}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.65 }}>за 30 дней</p>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <p className="co-about-label">Воронка студентов</p>
            {funnelRows.map((row, i) => {
              const max = Math.max(funnelRows[0].value, 1);
              const width = Math.max((row.value / max) * 100, row.value > 0 ? 4 : 0);
              return (
                <div key={row.label} style={{ margin: i === 0 ? 0 : "10px 0 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "#eef0e9", marginTop: 4 }}>
                    <div style={{ height: 8, borderRadius: 4, width: `${width}%`, background: "#d3f36b" }} />
                  </div>
                </div>
              );
            })}
            <p style={{ margin: "12px 0 0", fontSize: 12, opacity: 0.6 }}>
              Все цифры обезличены: платформа не раскрывает вузу студентов поимённо.
            </p>
          </div>

          {d.byStudyYear.length > 0 ? (
            <div className="panel" style={{ marginTop: 16 }}>
              <p className="co-about-label">По курсам</p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {d.byStudyYear.map((row) => (
                  <div key={row.study_year}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{row.count}</p>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>{row.study_year} курс</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!d.belowThreshold ? (
            <div className="panel" style={{ marginTop: 16 }}>
              <p className="co-about-label">Неактивные за 30 дней</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{d.inactive30d}</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.7 }}>
                студентов не проявляли активность месяц - повод напомнить о платформе
                в рассылке или чате вуза.
              </p>
            </div>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
