import { KpiCard, FunnelChart, DonutChart, TrendChart } from "./VuzCharts";
import type { UniversityDashboard } from "@/lib/university/stats";

/**
 * Визуальная часть дашборда ЦКС (KPI, тренд, воронка, курсы, неактивные).
 * Общая для живого /vuz и демо /vuz-demo - гарантирует, что демо один в один
 * повторяет реальный кабинет. Ожидает данные выше порога (cold-start плашку
 * показывает страница).
 */
export function VuzDashboardView({ d }: { d: UniversityDashboard }) {
  const funnelSteps = [
    { label: "Выбрали вуз в профиле", value: d.funnel.declared },
    { label: "Прошли AI-разбор резюме", value: d.funnel.withResumeAnalysis },
    { label: "Откликнулись на вакансии", value: d.funnel.applied },
    { label: "Получили приглашение", value: d.funnel.invited },
  ];
  const studentsSpark = d.trend.map((t) => t.students);
  const applicationsSpark = d.trend.map((t) => t.applications);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
        }}
      >
        <KpiCard
          label="Студентов на платформе"
          value={d.studentCount}
          sub={`+${d.studentsNew30d} за 30 дней`}
          spark={studentsSpark}
        />
        <KpiCard
          label="Откликов за 30 дней"
          value={d.activity30d.applications}
          spark={applicationsSpark}
        />
        <KpiCard
          label="Сохранённых вакансий"
          value={d.activity30d.savedVacancies}
          sub="за 30 дней"
          accent={false}
        />
        <KpiCard
          label="AI-разборов резюме"
          value={d.activity30d.resumeAnalyses}
          sub="за 30 дней"
          accent={false}
        />
      </div>

      {d.trend.length > 1 ? (
        <div className="panel">
          <p className="co-about-label">Динамика по неделям</p>
          <TrendChart
            labels={d.trend.map((t) => t.label)}
            series={[
              { name: "Отклики", color: "#c9f135", points: applicationsSpark, fill: true },
              { name: "Новые студенты", color: "#1e2114", points: studentsSpark },
            ]}
          />
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div className="panel">
          <p className="co-about-label">Воронка студентов</p>
          <FunnelChart steps={funnelSteps} />
          <p style={{ margin: "12px 0 0", fontSize: 12, opacity: 0.6 }}>
            Все цифры обезличены: платформа не раскрывает вузу студентов поимённо.
          </p>
        </div>

        {d.byStudyYear.length > 0 ? (
          <div className="panel">
            <p className="co-about-label">По курсам</p>
            <DonutChart
              segments={d.byStudyYear.map((r) => ({
                label: `${r.study_year} курс`,
                value: r.count,
              }))}
              centerLabel="студентов"
            />
          </div>
        ) : null}
      </div>

      <div className="panel" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div>
          <p className="co-about-label">Неактивные за 30 дней</p>
          <p style={{ margin: 0, fontFamily: '"Unbounded", sans-serif', fontSize: 30, fontWeight: 800, color: "#1e2114" }}>
            {d.inactive30d.toLocaleString("ru-RU")}
          </p>
        </div>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.7, maxWidth: 420 }}>
          студентов не проявляли активность месяц - повод напомнить о платформе
          в рассылке или чате вуза.
        </p>
      </div>
    </div>
  );
}
