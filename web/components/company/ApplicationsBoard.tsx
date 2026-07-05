"use client";

import { useState } from "react";
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/company/constants";

export type BoardApplication = {
  id: string;
  vacancy_slug: string;
  applicant_name: string;
  applicant_email: string;
  contact: string;
  cover_letter: string;
  resume_file: string | null;
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

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function ApplicationsBoard({
  companyId,
  initialApplications,
  showVacancyColumn = true,
}: {
  companyId: string;
  initialApplications: BoardApplication[];
  showVacancyColumn?: boolean;
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteAction, setNoteAction] = useState<"invited" | "rejected">("invited");

  const visible = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  async function setStatus(id: string, status: ApplicationStatus, statusNote?: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/company/${companyId}/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: statusNote }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка.");
        return;
      }
      setApplications((list) =>
        list.map((a) => (a.id === id ? { ...a, status, status_note: statusNote ?? null } : a)),
      );
      setNoteFor(null);
      setNote("");
    } catch {
      setError("Ошибка сети.");
    } finally {
      setBusy(null);
    }
  }

  function openNote(id: string, action: "invited" | "rejected") {
    setNoteFor(id);
    setNoteAction(action);
    setNote("");
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {(["all", "new", "viewed", "invited", "rejected", "withdrawn"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 999,
              border: "1px solid var(--border2, #ddd)",
              background: filter === s ? "var(--ink, #1e2114)" : "transparent",
              color: filter === s ? "#fff" : "inherit",
              cursor: "pointer",
              font: "inherit",
              fontSize: 13,
            }}
          >
            {s === "all" ? "Все" : APPLICATION_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "#c0392b" }}>{error}</p>}

      {!visible.length ? (
        <div className="panel">
          <p style={{ margin: 0 }}>Откликов пока нет.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {visible.map((a) => (
            <div key={a.id} className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 600 }}>
                    {a.applicant_name || a.applicant_email}
                    <span
                      style={{
                        marginLeft: 10,
                        padding: "0.12rem 0.55rem",
                        borderRadius: 999,
                        fontSize: 12,
                        color: "#fff",
                        background: STATUS_COLORS[a.status],
                      }}
                    >
                      {APPLICATION_STATUS_LABELS[a.status]}
                    </span>
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #666)" }}>
                    {formatDate(a.created_at)}
                    {showVacancyColumn ? ` · ${a.vacancy_slug}` : ""}
                    {` · ${a.applicant_email}`}
                    {a.contact ? ` · ${a.contact}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {a.resume_file && (
                    <a className="text-link" href={`/api/applications/${a.id}/resume`}>
                      Резюме
                    </a>
                  )}
                  {a.status === "new" && (
                    <button
                      className="btn-dark"
                      type="button"
                      disabled={busy === a.id}
                      onClick={() => setStatus(a.id, "viewed")}
                      style={{ fontSize: 13 }}
                    >
                      Просмотрен
                    </button>
                  )}
                  {(a.status === "new" || a.status === "viewed") && (
                    <>
                      <button
                        className="btn-dark"
                        type="button"
                        disabled={busy === a.id}
                        onClick={() => openNote(a.id, "invited")}
                        style={{ fontSize: 13, background: "#2e8b57" }}
                      >
                        Пригласить
                      </button>
                      <button
                        className="btn-dark"
                        type="button"
                        disabled={busy === a.id}
                        onClick={() => openNote(a.id, "rejected")}
                        style={{ fontSize: 13, background: "#c0392b" }}
                      >
                        Отказать
                      </button>
                    </>
                  )}
                </div>
              </div>

              {a.cover_letter && (
                <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap", fontSize: 14 }}>
                  {a.cover_letter}
                </p>
              )}
              {a.status_note && (
                <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--muted, #666)" }}>
                  Ваш ответ: {a.status_note}
                </p>
              )}

              {noteFor === a.id && (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  <textarea
                    style={{
                      width: "100%",
                      minHeight: 70,
                      padding: "0.55rem 0.65rem",
                      borderRadius: 10,
                      border: "1px solid var(--border2, #ddd)",
                      font: "inherit",
                    }}
                    placeholder={
                      noteAction === "invited"
                        ? "Как связаться, когда и какой следующий шаг (кандидат получит это письмом)"
                        : "Необязательный комментарий к отказу"
                    }
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={2000}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-dark"
                      type="button"
                      disabled={busy === a.id || (noteAction === "invited" && !note.trim())}
                      onClick={() => setStatus(a.id, noteAction, note.trim() || undefined)}
                      style={{ fontSize: 13 }}
                    >
                      {noteAction === "invited" ? "Отправить приглашение" : "Подтвердить отказ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteFor(null)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        font: "inherit",
                        fontSize: 13,
                        textDecoration: "underline",
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
