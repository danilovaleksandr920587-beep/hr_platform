import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { VuzNav } from "@/components/vuz/VuzNav";
import { VuzDashboardView } from "@/components/vuz/VuzDashboardView";
import { VuzChecklist, type ChecklistItem } from "@/components/vuz/VuzChecklist";
import { getActiveUniversity } from "@/lib/university/active-university";
import { getUniversityDashboard } from "@/lib/university/stats";
import { getUniversityTeamCounts } from "@/lib/university/store";
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
  const [d, team] = await Promise.all([
    getUniversityDashboard(university.id),
    getUniversityTeamCounts(university.id),
  ]);
  const displayName = university.short_name || university.name;

  // Онбординг-чеклист: состояние из реальных данных кабинета.
  const contactsFilled = Object.values(university.contacts ?? {}).some(
    (v) => typeof v === "string" && v.trim(),
  );
  const checklist: ChecklistItem[] = [
    {
      label: "Заполнить описание карьерного центра",
      done: university.description.trim() !== "",
      href: "/vuz/settings",
      cta: "Заполнить",
      hint: "Публикует витрину вуза для студентов и абитуриентов",
    },
    {
      label: "Добавить контакты ЦКС",
      done: contactsFilled,
      href: "/vuz/settings",
      cta: "Добавить",
    },
    {
      label: "Включить публичные цифры на витрине",
      done: university.public_stats,
      href: "/vuz/settings",
      cta: "Включить",
      hint: "Число студентов вуза - для абитуриентов (появится выше порога)",
    },
    {
      label: "Пригласить коллегу в кабинет",
      done: team.members > 1 || team.pendingInvites > 0,
      href: "/vuz/team",
      cta: "Пригласить",
    },
    {
      label: "Привести первых студентов (рассылка)",
      done: d.studentCount >= UNIVERSITY_STATS_MIN_GROUP,
      href: `mailto:${SUPPORT_EMAIL}?subject=Тексты рассылки для студентов`,
      cta: "Взять тексты",
      hint: `Выбрали вуз: ${d.studentCount} из ${UNIVERSITY_STATS_MIN_GROUP} для старта аналитики`,
    },
  ];
  const allDone = checklist.every((i) => i.done);

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 960 }}>
          <VuzNav universityName={displayName} />
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Чеклист показываем, пока не всё сделано; на пустом кабинете он - главный экран */}
            {!allDone ? <VuzChecklist items={checklist} /> : null}

            {d.belowThreshold ? (
              <div className="panel company-banner company-banner--warn">
                <p style={{ margin: 0 }}>
                  <strong>Аналитика откроется</strong> при {UNIVERSITY_STATS_MIN_GROUP}+
                  студентах, выбравших вуз. Пока можно посмотреть,{" "}
                  <a className="text-link" href="/vuz-demo">как будет выглядеть кабинет</a>.
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
