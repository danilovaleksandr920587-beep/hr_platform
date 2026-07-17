"use client";

import { useState } from "react";
import { UNIVERSITY_STATUS_LABELS } from "@/lib/university/constants";

type AdminUniversity = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  city: string | null;
  region: string | null;
  status: "active" | "hidden";
  student_count: number;
  member_count: number;
};

/** Онбординг вузов владельцем платформы: создание + инвайт ЦКС.
 *  Ссылку-инвайт показываем всегда (без SMTP передаётся вручную, часто в ТГ). */
export function UniversitiesManager({ initial }: { initial: AdminUniversity[] }) {
  const [universities, setUniversities] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [city, setCity] = useState("");
  const [creating, setCreating] = useState(false);

  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<{
    universityId: string;
    inviteUrl: string;
    emailSent: boolean;
  } | null>(null);

  async function createUniversity(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError("Название - минимум 3 символа.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, shortName, city }),
      });
      const data = (await res.json()) as {
        university?: AdminUniversity;
        error?: string;
      };
      if (!res.ok || !data.university) {
        setError(data.error ?? "Не удалось создать вуз.");
        return;
      }
      setUniversities((list) => [
        { ...data.university!, student_count: 0, member_count: 0 },
        ...list,
      ]);
      setName("");
      setShortName("");
      setCity("");
    } catch {
      setError("Ошибка сети.");
    } finally {
      setCreating(false);
    }
  }

  async function sendInvite(universityId: string) {
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setError("Укажите email.");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/admin/universities/${universityId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "owner" }),
      });
      const data = (await res.json()) as {
        inviteUrl?: string;
        emailSent?: boolean;
        error?: string;
      };
      if (!res.ok || !data.inviteUrl) {
        setError(data.error ?? "Не удалось создать приглашение.");
        return;
      }
      setInviteResult({
        universityId,
        inviteUrl: data.inviteUrl,
        emailSent: Boolean(data.emailSent),
      });
      setInviteEmail("");
      setInviteFor(null);
    } catch {
      setError("Ошибка сети.");
    }
  }

  async function toggleStatus(u: AdminUniversity) {
    const status = u.status === "active" ? "hidden" : "active";
    try {
      const res = await fetch(`/api/admin/universities/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setUniversities((list) =>
          list.map((item) => (item.id === u.id ? { ...item, status } : item)),
        );
      }
    } catch {}
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error && <p className="company-error">{error}</p>}

      <form className="panel" onSubmit={createUniversity} style={{ display: "grid", gap: 14 }}>
        <p className="co-about-label" style={{ margin: 0 }}>Новый вуз</p>
        <label className="company-field">
          Полное название
          <input
            className="company-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Университет науки и технологий МИСИС"
            required
            minLength={3}
          />
        </label>
        <div className="company-field-row">
          <label className="company-field">
            Короткое название
            <input
              className="company-input"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="МИСИС"
            />
          </label>
          <label className="company-field">
            Город
            <input
              className="company-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Москва"
            />
          </label>
        </div>
        <button className="btn-dark" type="submit" disabled={creating}>
          {creating ? "Создаём..." : "Создать вуз"}
        </button>
      </form>

      {universities.map((u) => (
        <div key={u.id} className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {u.short_name || u.name}{" "}
                <span style={{ fontWeight: 400, opacity: 0.6, fontSize: 13 }}>
                  /{u.slug} · {UNIVERSITY_STATUS_LABELS[u.status]}
                </span>
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.75 }}>
                {[u.city, u.region].filter(Boolean).join(", ") || "город не указан"} ·
                студентов: {u.student_count} · команда ЦКС: {u.member_count}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setInviteFor(inviteFor === u.id ? null : u.id);
                  setInviteResult(null);
                }}
              >
                Пригласить ЦКС
              </button>
              <button type="button" className="btn-outline" onClick={() => toggleStatus(u)}>
                {u.status === "active" ? "Скрыть" : "Активировать"}
              </button>
            </div>
          </div>

          {inviteFor === u.id ? (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                className="company-input"
                style={{ maxWidth: 320 }}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email руководителя ЦКС"
              />
              <button type="button" className="btn-dark" onClick={() => sendInvite(u.id)}>
                Отправить приглашение
              </button>
            </div>
          ) : null}

          {inviteResult?.universityId === u.id ? (
            <p className="company-notice" style={{ marginTop: 12, wordBreak: "break-all" }}>
              {inviteResult.emailSent
                ? "Письмо отправлено. Ссылка (на случай ручной передачи): "
                : "SMTP не настроен - передайте ссылку вручную: "}
              <code>{inviteResult.inviteUrl}</code>
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
