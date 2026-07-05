"use client";

import Link from "next/link";
import { useState } from "react";
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/company/constants";

export type MyApplication = {
  id: string;
  vacancy_slug: string;
  vacancy_title: string;
  company_name: string;
  status: ApplicationStatus;
  status_note: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: "#e5a500",
  viewed: "#8a8a8a",
  invited: "#2e8b57",
  rejected: "#c0392b",
  withdrawn: "#666",
};

const CANDIDATE_STATUS_LABELS: Record<ApplicationStatus, string> = {
  ...APPLICATION_STATUS_LABELS,
  new: "Отправлен",
  viewed: "Просмотрен компанией",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export function MyApplications({ initial }: { initial: MyApplication[] }) {
  const [applications, setApplications] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function withdraw(id: string) {
    if (!window.confirm("Отозвать отклик? Компания больше не увидит ваше резюме.")) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/office/applications/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка.");
        return;
      }
      setApplications((list) =>
        list.map((a) => (a.id === id ? { ...a, status: "withdrawn" as const } : a)),
      );
    } catch {
      setError("Ошибка сети.");
    } finally {
      setBusy(null);
    }
  }

  if (!applications.length) {
    return (
      <div className="panel">
        <p style={{ margin: "0 0 10px" }}>
          Пока нет откликов через платформу. Часть вакансий принимает отклики прямо здесь - ищите
          кнопку &laquo;Откликнуться&raquo; без перехода на внешний сайт.
        </p>
        <Link className="btn-dark" href="/vacancies" style={{ textDecoration: "none" }}>
          Смотреть вакансии
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {error && <p style={{ color: "#c0392b", margin: 0 }}>{error}</p>}
      {applications.map((a) => (
        <div key={a.id} className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 600 }}>
                <Link className="text-link" href={`/vacancies/${a.vacancy_slug}`}>
                  {a.vacancy_title || a.vacancy_slug}
                </Link>
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #666)" }}>
                {a.company_name ? `${a.company_name} · ` : ""}
                {formatDate(a.created_at)}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span
                style={{
                  padding: "0.15rem 0.6rem",
                  borderRadius: 999,
                  fontSize: 12,
                  color: "#fff",
                  background: STATUS_COLORS[a.status],
                }}
              >
                {CANDIDATE_STATUS_LABELS[a.status]}
              </span>
              {(a.status === "new" || a.status === "viewed") && (
                <button
                  type="button"
                  disabled={busy === a.id}
                  onClick={() => withdraw(a.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 13,
                    textDecoration: "underline",
                    color: "var(--muted, #666)",
                  }}
                >
                  Отозвать
                </button>
              )}
            </div>
          </div>
          {a.status_note && (a.status === "invited" || a.status === "rejected") && (
            <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap", fontSize: 14 }}>
              Сообщение от компании: {a.status_note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
