import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { VuzNav } from "@/components/vuz/VuzNav";
import { VuzDashboardView } from "@/components/vuz/VuzDashboardView";
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

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 960 }}>
          <VuzNav universityName={displayName} />
          <div style={{ marginTop: 16 }}>
            {d.belowThreshold ? (
              <div className="panel company-banner company-banner--warn">
                <p>
                  <strong>Данные накапливаются.</strong> Агрегаты откроются, когда
                  вуз выберут минимум {UNIVERSITY_STATS_MIN_GROUP} студентов. Быстрее
                  всего работает рассылка по студентам со ссылкой на платформу:
                  тексты дадим, напишите в{" "}
                  <a className="text-link" href={`mailto:${SUPPORT_EMAIL}`}>поддержку</a>.
                </p>
                <div style={{ margin: "14px 0 4px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 10, borderRadius: 6, background: "#eef0e9", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 6,
                        width: `${Math.min((d.studentCount / UNIVERSITY_STATS_MIN_GROUP) * 100, 100)}%`,
                        background: "linear-gradient(90deg, #a8d63a, #c9f135)",
                      }}
                    />
                  </div>
                  <span style={{ fontFamily: '"Unbounded", sans-serif', fontSize: 14, fontWeight: 700, color: "#1e2114", whiteSpace: "nowrap" }}>
                    {d.studentCount} / {UNIVERSITY_STATS_MIN_GROUP}
                  </span>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 13 }}>
                  Как будет выглядеть кабинет с данными -{" "}
                  <a className="text-link" href="/vuz-demo">посмотреть демо</a>.
                </p>
              </div>
            ) : (
              <VuzDashboardView d={d} />
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
