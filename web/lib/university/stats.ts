import "server-only";
import { getSql } from "@/lib/db/postgres";
import { UNIVERSITY_STATS_MIN_GROUP } from "./constants";

/**
 * Агрегаты дашборда кабинета вуза. ТОЛЬКО обезличенные счётчики - вуз
 * никогда не видит студентов поимённо (vuz-portal-design.md §6).
 * Срезы меньше порога UNIVERSITY_STATS_MIN_GROUP не раскрываются.
 */
export type UniversityDashboard = {
  /** Студентов выбрало вуз (всего / за 30 дней). */
  studentCount: number;
  studentsNew30d: number;
  /** Данных мало - фронт показывает плашку cold-start вместо цифр. */
  belowThreshold: boolean;
  /** Активность студентов вуза за 30 дней. */
  activity30d: {
    savedVacancies: number;
    applications: number;
    resumeAnalyses: number;
  };
  /** Воронка (за всё время): выбрал вуз -> анализ резюме -> отклик -> приглашение. */
  funnel: {
    declared: number;
    withResumeAnalysis: number;
    applied: number;
    invited: number;
  };
  /** Срезы по курсам: только группы >= порога. */
  byStudyYear: { study_year: number; count: number }[];
  /** Неактивные: выбрали вуз, но не заходили в активность 30 дней (число, не список). */
  inactive30d: number;
  /** Тренд по неделям (8 точек): новые студенты и отклики. */
  trend: { label: string; students: number; applications: number }[];
};

export async function getUniversityDashboard(
  universityId: string,
): Promise<UniversityDashboard> {
  const sql = getSql();

  const [core] = (await sql`
    with students as (
      select account_id, updated_at from student_profiles
      where university_id = ${universityId}
    )
    select
      (select count(*)::int from students) as student_count,
      (select count(*)::int from students
        where updated_at > now() - interval '30 days') as students_new_30d,
      (select count(*)::int from user_saved_vacancies sv
        join students s on s.account_id = sv.account_id
        where sv.saved_at > now() - interval '30 days') as saved_30d,
      (select count(*)::int from applications ap
        join students s on s.account_id = ap.account_id
        where ap.created_at > now() - interval '30 days') as applications_30d,
      (select count(*)::int from user_resume_analyses ra
        join students s on s.account_id = ra.account_id
        where ra.created_at > now() - interval '30 days') as analyses_30d,
      (select count(distinct ra.account_id)::int from user_resume_analyses ra
        join students s on s.account_id = ra.account_id) as with_analysis,
      (select count(distinct ap.account_id)::int from applications ap
        join students s on s.account_id = ap.account_id) as applied,
      (select count(distinct ap.account_id)::int from applications ap
        join students s on s.account_id = ap.account_id
        where ap.status = 'invited') as invited,
      (select count(*)::int from students st
        where not exists (
          select 1 from user_saved_vacancies sv
          where sv.account_id = st.account_id
            and sv.saved_at > now() - interval '30 days'
        ) and not exists (
          select 1 from applications ap
          where ap.account_id = st.account_id
            and ap.created_at > now() - interval '30 days'
        ) and not exists (
          select 1 from user_resume_analyses ra
          where ra.account_id = st.account_id
            and ra.created_at > now() - interval '30 days'
        )) as inactive_30d
  `) as {
    student_count: number;
    students_new_30d: number;
    saved_30d: number;
    applications_30d: number;
    analyses_30d: number;
    with_analysis: number;
    applied: number;
    invited: number;
    inactive_30d: number;
  }[];

  const byYear = (await sql`
    select study_year, count(*)::int as count
    from student_profiles
    where university_id = ${universityId} and study_year is not null
    group by study_year
    having count(*) >= ${UNIVERSITY_STATS_MIN_GROUP}
    order by study_year
  `) as { study_year: number; count: number }[];

  // Тренд по неделям (8 недель): новые студенты + отклики. generate_series
  // гарантирует непрерывную ось даже в пустые недели.
  const trend = (await sql`
    with weeks as (
      select generate_series(
        date_trunc('week', now()) - interval '7 weeks',
        date_trunc('week', now()),
        interval '1 week'
      ) as wk
    )
    select
      to_char(w.wk, 'DD.MM') as label,
      (select count(*)::int from student_profiles sp
        where sp.university_id = ${universityId}
          and date_trunc('week', sp.updated_at) = w.wk) as students,
      (select count(*)::int from applications a
        join student_profiles sp on sp.account_id = a.account_id
        where sp.university_id = ${universityId}
          and date_trunc('week', a.created_at) = w.wk) as applications
    from weeks w
    order by w.wk
  `) as { label: string; students: number; applications: number }[];

  const belowThreshold = core.student_count < UNIVERSITY_STATS_MIN_GROUP;

  return {
    studentCount: core.student_count,
    studentsNew30d: core.students_new_30d,
    belowThreshold,
    activity30d: belowThreshold
      ? { savedVacancies: 0, applications: 0, resumeAnalyses: 0 }
      : {
          savedVacancies: core.saved_30d,
          applications: core.applications_30d,
          resumeAnalyses: core.analyses_30d,
        },
    funnel: belowThreshold
      ? { declared: core.student_count, withResumeAnalysis: 0, applied: 0, invited: 0 }
      : {
          declared: core.student_count,
          withResumeAnalysis: core.with_analysis,
          applied: core.applied,
          invited: core.invited,
        },
    byStudyYear: belowThreshold ? [] : byYear,
    inactive30d: belowThreshold ? 0 : core.inactive_30d,
    trend: belowThreshold ? [] : trend,
  };
}
