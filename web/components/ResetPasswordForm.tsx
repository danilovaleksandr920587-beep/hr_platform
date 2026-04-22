"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ApiResponse = { ok?: boolean; error?: string };

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 6) {
      setError("Пароль не короче 6 символов.");
      return;
    }
    if (password !== password2) {
      setError("Пароли не совпадают.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok) {
        setError(data.error ?? "Не удалось обновить пароль.");
        setBusy(false);
        return;
      }
      setMessage("Пароль обновлён. Перенаправляем на страницу входа...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить пароль.");
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: "1rem" }}>
      <form onSubmit={onSubmit}>
        <label className="filter-inline" style={{ width: "100%" }}>
          Новый пароль
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "0.55rem 0.65rem",
              borderRadius: 10,
              border: "1px solid var(--border2)",
              font: "inherit",
            }}
            placeholder="••••••••"
          />
        </label>
        <label className="filter-inline" style={{ width: "100%", marginTop: "0.75rem" }}>
          Повторите пароль
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "0.55rem 0.65rem",
              borderRadius: 10,
              border: "1px solid var(--border2)",
              font: "inherit",
            }}
            placeholder="••••••••"
          />
        </label>
        <div className="hero-actions">
          <button className="btn btn-coral" type="submit" disabled={busy}>
            {busy ? "Сохраняем..." : "Сохранить пароль"}
          </button>
          <Link className="btn btn-light" href="/login">
            Ко входу
          </Link>
        </div>
      </form>
      {error ? (
        <p className="hero-text" style={{ color: "var(--coral)", marginTop: "0.75rem" }}>
          {error}
        </p>
      ) : null}
      {message ? <p className="hero-text" style={{ marginTop: "0.75rem" }}>{message}</p> : null}
    </div>
  );
}

