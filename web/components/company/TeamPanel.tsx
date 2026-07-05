"use client";

import { useState } from "react";
import { COMPANY_ROLE_LABELS, roleAtLeast, type CompanyRole } from "@/lib/company/constants";

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
  const canManage = roleAtLeast(viewerRole, "admin");
  // Роли, которые текущий пользователь может назначать: owner - все,
  // admin - только admin/recruiter (не может выдать/тронуть owner)
  const assignableRoles: CompanyRole[] = isOwner
    ? ["owner", "admin", "recruiter"]
    : ["admin", "recruiter"];

  function canManageMember(m: TeamMember): boolean {
    if (!canManage) return false;
    if (m.account_id === viewerAccountId) return false;
    // admin не может трогать владельцев
    if (!isOwner && m.role === "owner") return false;
    return true;
  }

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
              {canManageMember(m) && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    style={{
                      padding: "0.3rem 0.5rem",
                      borderRadius: 8,
                      border: "1px solid var(--border2, #ddd)",
                      font: "inherit",
                      fontSize: 13,
                    }}
                    value={m.role}
                    disabled={busy}
                    onChange={(e) => patchMember(m.account_id, { role: e.target.value as CompanyRole })}
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>{COMPANY_ROLE_LABELS[r]}</option>
                    ))}
                  </select>
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

      {canManage ? (
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
              <option value="admin">Администратор - плюс команда и настройки</option>
              {isOwner && <option value="owner">Владелец - полный доступ</option>}
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
          Приглашать и менять роли могут владелец и администраторы компании.
        </p>
      )}
    </div>
  );
}
