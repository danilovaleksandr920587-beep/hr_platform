import {
  COMPANY_VACANCY_STATUS_LABELS,
  type CompanyVacancyStatus,
} from "@/lib/company/constants";

const COLORS: Record<CompanyVacancyStatus, string> = {
  draft: "#8a8a8a",
  pending_review: "#e5a500",
  published: "#2e8b57",
  rejected: "#c0392b",
  archived: "#666",
};

export function VacancyStatusBadge({ status }: { status: CompanyVacancyStatus }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.6rem",
        borderRadius: 999,
        fontSize: 12,
        color: "#fff",
        background: COLORS[status] ?? "#8a8a8a",
      }}
    >
      {COMPANY_VACANCY_STATUS_LABELS[status] ?? status}
    </span>
  );
}
