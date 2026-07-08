"use client";

import { useState } from "react";

export function ChangeEmailForm() {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setMsg("");
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (res.ok) {
        setState("done");
        setMsg(data.message || "Письмо для подтверждения отправлено на новый адрес.");
        setPassword("");
      } else {
        setState("error");
        setMsg(data.error || "Не удалось сменить email.");
      }
    } catch {
      setState("error");
      setMsg("Сеть недоступна. Попробуйте позже.");
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      <label style={{ display: "grid", gap: 4, fontSize: 14 }}>
        Новый email
        <input
          type="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="new@example.com"
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border2, #ccc)" }}
        />
      </label>
      <label style={{ display: "grid", gap: 4, fontSize: 14 }}>
        Текущий пароль
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border2, #ccc)" }}
        />
      </label>
      <button
        type="submit"
        disabled={state === "sending"}
        style={{
          padding: "9px 16px",
          borderRadius: 8,
          border: "none",
          background: "#1e2114",
          color: "#fff",
          cursor: state === "sending" ? "default" : "pointer",
          fontSize: 14,
          justifySelf: "start",
        }}
      >
        {state === "sending" ? "Отправляем…" : "Сменить email"}
      </button>
      {msg ? (
        <p style={{ margin: 0, fontSize: 14, color: state === "error" ? "#a13d3d" : "#245224" }}>{msg}</p>
      ) : null}
    </form>
  );
}
