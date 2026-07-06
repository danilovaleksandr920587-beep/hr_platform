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
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

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
      const data = (await res.json()) as {
        error?: string;
        inviteUrl?: string;
        emailSent?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить приглашение.");
        return;
      }
      setNotice(
        data.emailSent
          ? `Приглашение отправлено на ${email}.`
          : `Приглашение для ${email} создано. Письма не будет - передайте ссылку сами:`,
      );
      setInviteLink(data.inviteUrl ?? null);
      setLinkCopied(false);
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
        <div>
          {members.map((m) => (
            <div key={m.account_id} className="team-member-row">
              <div>
                <span className="team-member-name">{m.display_name || m.email}</span>
                <span className="team-member-detail">
                  {m.email} · {COMPANY_ROLE_LABELS[m.role]}
                  {m.status === "disabled" ? " · отключён" : ""}
                  {m.account_id === viewerAccountId ? " · это вы" : ""}
                </span>
              </div>
              {canManageMember(m) && (
                <div className="team-member-controls">
                  <select
                    className="company-select-field"
                    style={{ padding: "0.35rem 0.5rem", fontSize: 13 }}
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
                      className="btn-ghost btn-ghost--danger"
                      type="button"
                      disabled={busy}
                      onClick={() => patchMember(m.account_id, { status: "disabled" })}
                    >
                      Отключить
                    </button>
                  ) : (
                    <button
                      className="btn-ghost"
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
          <div>
            {invites.map((i) => (
              <p key={i.id} className="team-invite-row">
                <span>{i.email}</span>
                <span>{COMPANY_ROLE_LABELS[i.role]}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {canManage ? (
        <form className="panel" onSubmit={invite} style={{ display: "grid", gap: 14 }}>
          <h2 style={{ marginTop: 0 }}>Пригласить в команду</h2>
          <label className="company-field">
            Email коллеги
            <input
              className="company-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="hr@company.ru"
            />
          </label>
          <label className="company-field">
            Роль
            <select className="company-select-field" value={role} onChange={(e) => setRole(e.target.value as CompanyRole)}>
              <option value="recruiter">Рекрутер - вакансии и отклики</option>
              <option value="admin">Администратор - плюс команда и настройки</option>
              {isOwner && <option value="owner">Владелец - полный доступ</option>}
            </select>
          </label>
          {error && <p className="company-error">{error}</p>}
          {notice && <p className="company-notice">{notice}</p>}
          {inviteLink && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
              <input
                readOnly
                value={inviteLink}
                onFocus={(e) => e.target.select()}
                style={{ flex: "1 1 260px", fontSize: 12, padding: "6px 8px" }}
                aria-label="Ссылка приглашения"
              />
              <button
                type="button"
                className="btn-dark"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteLink).then(
                    () => setLinkCopied(true),
                    () => setLinkCopied(false),
                  );
                }}
              >
                {linkCopied ? "Скопировано" : "Скопировать"}
              </button>
            </div>
          )}
          <button className="btn-dark" type="submit" disabled={busy}>
            {busy ? "Отправляем..." : "Отправить приглашение"}
          </button>
        </form>
      ) : (
        <p className="company-hint">
          Приглашать и менять роли могут владелец и администраторы компании.
        </p>
      )}
    </div>
  );
}
