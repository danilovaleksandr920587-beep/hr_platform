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

const STATUS_TONES: Record<ApplicationStatus, string> = {
  new: "status-pill--pending",
  viewed: "status-pill--neutral",
  invited: "status-pill--positive",
  rejected: "status-pill--negative",
  withdrawn: "status-pill--neutral",
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
      <div className="applications-filters">
        {(["all", "new", "viewed", "invited", "rejected", "withdrawn"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`company-tab${filter === s ? " is-active" : ""}`}
          >
            {s === "all" ? "Все" : APPLICATION_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {error && <p className="company-error">{error}</p>}

      {!visible.length ? (
        <div className="panel">
          <p style={{ margin: 0 }}>Откликов пока нет.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {visible.map((a) => (
            <div key={a.id} className="panel application-card">
              <div className="application-card-head">
                <div>
                  <p className="application-card-name">
                    {a.applicant_name || a.applicant_email}
                    <span className={`status-pill ${STATUS_TONES[a.status]}`}>
                      {APPLICATION_STATUS_LABELS[a.status]}
                    </span>
                  </p>
                  <p className="application-card-meta">
                    {formatDate(a.created_at)}
                    {showVacancyColumn ? ` · ${a.vacancy_slug}` : ""}
                    {` · ${a.applicant_email}`}
                    {a.contact ? ` · ${a.contact}` : ""}
                  </p>
                </div>
                <div className="application-card-actions">
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
                    >
                      Просмотрен
                    </button>
                  )}
                  {(a.status === "new" || a.status === "viewed") && (
                    <>
                      <button
                        className="btn-dark btn-dark--success"
                        type="button"
                        disabled={busy === a.id}
                        onClick={() => openNote(a.id, "invited")}
                      >
                        Пригласить
                      </button>
                      <button
                        className="btn-dark btn-dark--danger"
                        type="button"
                        disabled={busy === a.id}
                        onClick={() => openNote(a.id, "rejected")}
                      >
                        Отказать
                      </button>
                    </>
                  )}
                </div>
              </div>

              {a.cover_letter && <p className="application-card-note">{a.cover_letter}</p>}
              {a.status_note && (
                <p className="application-card-meta">Ваш ответ: {a.status_note}</p>
              )}

              {noteFor === a.id && (
                <div className="application-note-form">
                  <textarea
                    className="company-textarea"
                    style={{ minHeight: 70 }}
                    placeholder={
                      noteAction === "invited"
                        ? "Как связаться, когда и какой следующий шаг (кандидат получит это письмом)"
                        : "Необязательный комментарий к отказу"
                    }
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={2000}
                  />
                  <div className="company-form-actions">
                    <button
                      className="btn-dark"
                      type="button"
                      disabled={busy === a.id || (noteAction === "invited" && !note.trim())}
                      onClick={() => setStatus(a.id, noteAction, note.trim() || undefined)}
                    >
                      {noteAction === "invited" ? "Отправить приглашение" : "Подтвердить отказ"}
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => setNoteFor(null)}>
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
