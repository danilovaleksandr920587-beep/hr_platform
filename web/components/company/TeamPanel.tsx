"use client";

import { useState } from "react";
import { COMPANY_ROLE_LABELS, type CompanyRole } from "@/lib/company/constants";

export type TeamMember = {
  account_id: string;
  role: CompanyRole;
  status: string;
  email: string;
  display_name: string;
};

export type TeamInvite = {
  id: string;
  email: string;
  role: CompanyRole;
  expires_at: string;
};

const inputStyle = {
  width: "100%" as const,
  marginTop: 6,
  padding: "0.55rem 0.65rem",
  borderRadius: 10,
  border: "1px solid var(--border2, #ddd)",
  font: "inherit" as const,
};

export function TeamPanel({
  companyId,
  viewerAccountId,
  viewerRole,
  initialMembers,
  initialInvites,
}: {
  companyId: string;
  viewerAccountId: string;
  viewerRole: CompanyRole;
  initialMembers: TeamMember[];
  initialInvites: TeamInvite[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>("recruiter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isOwner = viewerRole === "owner";

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/company/${companyId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить приглашение.");
        return;
      }
      setNotice(`Приглашение отправлено на ${email}.`);
      setInvites((list) => [
        { id: `tmp-${Date.now()}`, email, role, expires_at: "" },
        ...list.filter((i) => i.email !== email),
      ]);
      setEmail("");
    } catch {
      setError("Ошибка сети.");
    } finally {
      setBusy(false);
    }
  }

  async function patchMember(accountId: string, patch: { role?: CompanyRole; status?: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/company/${companyId}/members/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка.");
        return;
      }
      setMembers((list) =>
        list.map((m) => (m.account_id === accountId ? { ...m, ...patch } as TeamMember : m)),
      );
    } catch {
      setError("Ошибка сети.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Участники</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {members.map((m) => (
            <div
              key={m.account_id}
              style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}
            >
              <div>
                <strong>{m.display_name || m.email}</strong>{" "}
                <span style={{ fontSize: 13, color: "var(--muted, #666)" }}>
                  {m.email} · {COMPANY_ROLE_LABELS[m.role]}
                  {m.status === "disabled" ? " · отключён" : ""}
                  {m.account_id === viewerAccountId ? " · это вы" : ""}
                </span>
              </div>
              {isOwner && m.account_id !== viewerAccountId && (
                <div style={{ display: "flex", gap: 8 }}>
                  {m.role === "recruiter" ? (
                    <button
                      className="text-link"
                      style={{ border: "none", background: "none", cursor: "pointer", font: "inherit" }}
                      type="button"
                      disabled={busy}
                      onClick={() => patchMember(m.account_id, { role: "owner" })}
                    >
                      Сделать владельцем
                    </button>
                  ) : (
                    <button
                      className="text-link"
                      style={{ border: "none", background: "none", cursor: "pointer", font: "inherit" }}
                      type="button"
                      disabled={busy}
                      onClick={() => patchMember(m.account_id, { role: "recruiter" })}
                    >
                      Сделать рекрутером
                    </button>
                  )}
                  {m.status === "active" ? (
                    <button
                      className="text-link"
                      style={{ border: "none", background: "none", cursor: "pointer", font: "inherit", color: "#c0392b" }}
                      type="button"
                      disabled={busy}
                      onClick={() => patchMember(m.account_id, { status: "disabled" })}
                    >
                      Отключить
                    </button>
                  ) : (
                    <button
                      className="text-link"
                      style={{ border: "none", background: "none", cursor: "pointer", font: "inherit" }}
                      type="button"
                      disabled={busy}
                      onClick={() => patchMember(m.account_id, { status: "active" })}
                    >
                      Включить
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {invites.length > 0 && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Ожидают принятия</h2>
          <div style={{ display: "grid", gap: 6 }}>
            {invites.map((i) => (
              <p key={i.id} style={{ margin: 0, fontSize: 14 }}>
                {i.email} · {COMPANY_ROLE_LABELS[i.role]}
              </p>
            ))}
          </div>
        </div>
      )}

      {isOwner ? (
        <form className="panel" onSubmit={invite} style={{ display: "grid", gap: 12 }}>
          <h2 style={{ marginTop: 0 }}>Пригласить в команду</h2>
          <label>
            Email коллеги
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="hr@company.ru"
            />
          </label>
          <label>
            Роль
            <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value as CompanyRole)}>
              <option value="recruiter">Рекрутер - вакансии и отклики</option>
              <option value="owner">Владелец - плюс команда и настройки</option>
            </select>
          </label>
          {error && <p style={{ color: "#c0392b", margin: 0 }}>{error}</p>}
          {notice && <p style={{ color: "#2e8b57", margin: 0 }}>{notice}</p>}
          <button className="btn-dark" type="submit" disabled={busy}>
            {busy ? "Отправляем..." : "Отправить приглашение"}
          </button>
        </form>
      ) : (
        <p style={{ fontSize: 13, color: "var(--muted, #666)" }}>
          Приглашать и менять роли может владелец компании.
        </p>
      )}
    </div>
  );
}
