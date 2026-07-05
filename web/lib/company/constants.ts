export const COMPANY_ROLES = ["owner", "recruiter"] as const;
export type CompanyRole = (typeof COMPANY_ROLES)[number];

export const COMPANY_STATUSES = ["pending", "verified", "rejected", "blocked"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "new",
  "viewed",
  "invited",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const COMPANY_VACANCY_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "archived",
] as const;
export type CompanyVacancyStatus = (typeof COMPANY_VACANCY_STATUSES)[number];

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  owner: "Владелец",
  recruiter: "Рекрутер",
};

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  pending: "На проверке",
  verified: "Подтверждена",
  rejected: "Отклонена",
  blocked: "Заблокирована",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "Новый",
  viewed: "Просмотрен",
  invited: "Приглашение",
  rejected: "Отказ",
  withdrawn: "Отозван",
};

export const COMPANY_VACANCY_STATUS_LABELS: Record<CompanyVacancyStatus, string> = {
  draft: "Черновик",
  pending_review: "На модерации",
  published: "Опубликована",
  rejected: "Отклонена",
  archived: "В архиве",
};

/** Статусы отклика, которые может выставлять компания. */
export const COMPANY_SETTABLE_APPLICATION_STATUSES: ApplicationStatus[] = [
  "viewed",
  "invited",
  "rejected",
];
