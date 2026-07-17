export const UNIVERSITY_ROLES = ["owner", "staff"] as const;
export type UniversityRole = (typeof UNIVERSITY_ROLES)[number];

/** Иерархия ролей ЦКС: owner > staff. */
export const UNIVERSITY_ROLE_RANK: Record<UniversityRole, number> = {
  owner: 2,
  staff: 1,
};

/** Роль value имеет права не ниже required. */
export function universityRoleAtLeast(
  value: UniversityRole,
  required: UniversityRole,
): boolean {
  return UNIVERSITY_ROLE_RANK[value] >= UNIVERSITY_ROLE_RANK[required];
}

export const UNIVERSITY_STATUSES = ["active", "hidden"] as const;
export type UniversityStatus = (typeof UNIVERSITY_STATUSES)[number];

export const UNIVERSITY_ROLE_LABELS: Record<UniversityRole, string> = {
  owner: "Руководитель",
  staff: "Сотрудник",
};

export const UNIVERSITY_STATUS_LABELS: Record<UniversityStatus, string> = {
  active: "Активен",
  hidden: "Скрыт",
};

/** Минимум студентов в группе для показа агрегата (защита малых выборок, §6). */
export const UNIVERSITY_STATS_MIN_GROUP = 5;

/** Курс: 1..6 (бакалавриат + магистратура/специалитет). */
export const STUDY_YEARS = [1, 2, 3, 4, 5, 6] as const;
