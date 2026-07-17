"use client";

import { useState } from "react";
import {
  UNIVERSITY_ROLE_LABELS,
  type UniversityRole,
} from "@/lib/university/constants";

type Member = {
  account_id: string;
  role: UniversityRole;
  status: string;
  email: string;
  display_name: string;
};

type Invite = {
  id: string;
  email: string;
  role: UniversityRole;
  expires_at: string;
};

export function VuzTeam({
  universityId,
  selfAccountId,
  isOwner,
  initialMembers,
  initialInvites,
}: {
  universityId: string;
  selfAccountId: string;
  isOwner: boolean;
  initialMembers: Member[];
  initialInvites: Invite[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UniversityRole>("staff");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function refresh() {
    try {
      const res = await fetch(`/api/university/${universityId}/members`);
      if (!res.ok) return;
      const data = (await res.json()) as { members?: Member[]; invites?: Invite[] };
      if (data.members) setMembers(data.members);
      if (data.invites) setInvites(data.invites);
    } catch {}
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setError("Укажите email.");
      return;
    }
    setSending(true);
    setError(null);
    setInviteUrl(null);
    try {
      const res = await fetch(`/api/university/${universityId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = (await res.json()) as {
        inviteUrl?: string;
        emailSent?: boolean;
        error?: string;
      };
      if (!res.ok || !data.inviteUrl) {
        setError(data.error ?? "Не удалось отправить приглашение.");
        return;
      }
      setInviteUrl(data.inviteUrl);
      setInviteEmailSent(Boolean(data.emailSent));
      setInviteEmail("");
      void refresh();
    } catch {
      setError("Ошибка сети.");
    } finally {
      setSending(false);
    }
  }

  async function updateMember(
    accountId: string,
    patch: { role?: UniversityRole; status?: string },
  ) {
    setError(null);
    try {
      const res = await fetch(`/api/university/${universityId}/members/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось обновить участника.");
        return;
      }
      void refresh();
    } catch {
      setError("Ошибка сети.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error && <p className="company-error">{error}</p>}

      <div className="panel">
        <p className="co-about-label">Команда карьерного центра</p>
        {members.map((m) => (
          <div
            key={m.account_id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 0",
              borderTop: "1px solid rgba(0,0,0,.06)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {m.display_name || m.email}
                {m.account_id === selfAccountId ? " (вы)" : ""}
              </p>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>
                {m.email} · {UNIVERSITY_ROLE_LABELS[m.role]}
                {m.status === "disabled" ? " · отключён" : ""}
              </p>
            </div>
            {isOwner && m.account_id !== selfAccountId ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    updateMember(m.account_id, {
                      role: m.role === "owner" ? "staff" : "owner",
                    })
                  }
                >
                  {m.role === "owner" ? "Сделать сотрудником" : "Сделать руководителем"}
                </button>
                <button
                  type="button"
                  className={m.status === "disabled" ? "btn-ghost" : "btn-ghost--danger btn-ghost"}
                  onClick={() =>
                    updateMember(m.account_id, {
                      status: m.status === "disabled" ? "active" : "disabled",
                    })
                  }
                >
                  {m.status === "disabled" ? "Включить" : "Отключить"}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {invites.length > 0 ? (
        <div className="panel">
          <p className="co-about-label">Ожидают принятия</p>
          {invites.map((i) => (
            <p key={i.id} style={{ margin: "6px 0", fontSize: 14 }}>
              {i.email} · {UNIVERSITY_ROLE_LABELS[i.role]} · до{" "}
              {new Date(i.expires_at).toLocaleDateString("ru-RU")}
            </p>
          ))}
        </div>
      ) : null}

      {isOwner ? (
        <form className="panel" onSubmit={sendInvite} style={{ display: "grid", gap: 14 }}>
          <p className="co-about-label" style={{ margin: 0 }}>Пригласить коллегу</p>
          <div className="company-field-row">
            <label className="company-field">
              Email
              <input
                className="company-input"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email коллеги"
                required
              />
            </label>
            <label className="company-field">
              Роль
              <select
                className="company-select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UniversityRole)}
              >
                <option value="staff">Сотрудник</option>
                <option value="owner">Руководитель</option>
              </select>
            </label>
          </div>
          <button className="btn-dark" type="submit" disabled={sending}>
            {sending ? "Отправляем..." : "Пригласить"}
          </button>
          {inviteUrl ? (
            <p className="company-notice" style={{ wordBreak: "break-all" }}>
              {inviteEmailSent
                ? "Письмо отправлено. Ссылка (на случай ручной передачи): "
                : "SMTP не настроен - передайте ссылку вручную: "}
              <code>{inviteUrl}</code>
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
