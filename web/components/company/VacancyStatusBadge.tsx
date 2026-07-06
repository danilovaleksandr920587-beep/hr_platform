import {
  COMPANY_VACANCY_STATUS_LABELS,
  type CompanyVacancyStatus,
} from "@/lib/company/constants";

const TONES: Record<CompanyVacancyStatus, string> = {
  draft: "status-pill--neutral",
  pending_review: "status-pill--pending",
  published: "status-pill--positive",
  rejected: "status-pill--negative",
  archived: "status-pill--neutral",
};

export function VacancyStatusBadge({ status }: { status: CompanyVacancyStatus }) {
  return (
    <span className={`status-pill ${TONES[status] ?? "status-pill--neutral"}`}>
      {COMPANY_VACANCY_STATUS_LABELS[status] ?? status}
    </span>
  );
}
