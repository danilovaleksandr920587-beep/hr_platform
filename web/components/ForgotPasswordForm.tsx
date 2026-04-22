"use client";

import Link from "next/link";
import { useState } from "react";

type ApiResponse = { ok?: boolean; error?: string; message?: string };

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить запрос.");
        setBusy(false);
        return;
      }
      setMessage(data.message ?? "Проверьте почту для восстановления пароля.");
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить запрос.");
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: "1rem" }}>
      <form onSubmit={onSubmit}>
        <label className="filter-inline" style={{ width: "100%" }}>
          Email
          <input
            type="email"
            required
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "0.55rem 0.65rem",
              borderRadius: 10,
              border: "1px solid var(--border2)",
              font: "inherit",
            }}
            placeholder="you@example.com"
          />
        </label>
        <div className="hero-actions">
          <button className="btn btn-coral" type="submit" disabled={busy || !email.trim()}>
            {busy ? "Отправка..." : "Отправить ссылку"}
          </button>
          <Link className="btn btn-light" href="/login">
            Назад ко входу
          </Link>
        </div>
      </form>

      {error ? (
        <p className="hero-text" style={{ color: "var(--coral)", marginTop: "0.75rem" }}>
          {error}
        </p>
      ) : null}
      {message ? <p className="hero-text" style={{ marginTop: "0.75rem" }}>{message}</p> : null}
      <p className="hero-text" style={{ marginTop: "0.5rem" }}>
        Не пришло письмо? Проверьте папку «Спам» или повторите запрос через минуту.
      </p>
    </div>
  );
}

