import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { VuzDashboardView } from "@/components/vuz/VuzDashboardView";
import type { UniversityDashboard } from "@/lib/university/stats";

export const metadata: Metadata = {
  title: "Кабинет вуза - демо",
  robots: { index: false, follow: false },
};

/**
 * Демо кабинета вуза для продажи (noindex, без входа) - как /office-demo.
 * Данные ИЛЛЮСТРАТИВНЫЕ, на нейтральном «Университете-примере»: показываем,
 * как выглядит кабинет с накопленными данными, не выдавая цифры за реальные.
 */
const DEMO: UniversityDashboard = {
  studentCount: 342,
  studentsNew30d: 48,
  belowThreshold: false,
  activity30d: { savedVacancies: 512, applications: 176, resumeAnalyses: 231 },
  funnel: { declared: 342, withResumeAnalysis: 231, applied: 176, invited: 63 },
  byStudyYear: [
    { study_year: 1, count: 38 },
    { study_year: 2, count: 57 },
    { study_year: 3, count: 94 },
    { study_year: 4, count: 88 },
    { study_year: 5, count: 41 },
    { study_year: 6, count: 24 },
  ],
  inactive30d: 71,
  trend: [
    { label: "26.05", students: 3, applications: 12 },
    { label: "02.06", students: 5, applications: 18 },
    { label: "09.06", students: 4, applications: 15 },
    { label: "16.06", students: 8, applications: 27 },
    { label: "23.06", students: 11, applications: 31 },
    { label: "30.06", students: 9, applications: 29 },
    { label: "07.07", students: 14, applications: 44 },
    { label: "14.07", students: 18, applications: 52 },
  ],
};

export default function VuzDemoPage() {
  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 960 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              borderRadius: 20,
              background: "#1e2114",
              color: "#c9f135",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            ДЕМО · данные иллюстративные
          </div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            Кабинет карьерного центра
          </h1>
          <p className="hero-text" style={{ marginBottom: 20 }}>
            Так выглядит панель вуза, когда студенты выбрали его на CareerLab.
            Цифры на этой странице - пример для наглядности. В вашем кабинете
            будут реальные обезличенные данные ваших студентов.
          </p>

          <VuzDashboardView d={DEMO} />

          <div className="panel" style={{ marginTop: 20, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              Хотите такой кабинет для своего вуза?{" "}
              <Link className="text-link" href="/universities">
                Вузы-партнёры
              </Link>{" "}
              или напишите нам - подключим бесплатно.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
