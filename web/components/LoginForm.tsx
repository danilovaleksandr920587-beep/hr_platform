"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function safeNextPath(raw: string | undefined) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/office";
  return raw;
}

export function LoginForm({
  nextPath,
  configured,
}: {
  nextPath: string;
  configured: boolean;
}) {
  const next = useMemo(() => safeNextPath(nextPath), [nextPath]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!configured) {
      setStatus("error");
      setMessage("Задайте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    setStatus("loading");
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("sent");
      setMessage("Проверьте почту — мы отправили ссылку для входа.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Ошибка входа");
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel" style={{ marginTop: "1rem" }}>
      <label className="filter-inline" style={{ width: "100%" }}>
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{
            width: "100%",
            marginTop: 6,
            padding: "0.55rem 0.65rem",
            borderRadius: 10,
            border: "1px solid var(--border2)",
            font: "inherit",
          }}
        />
      </label>
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          marginTop: "0.75rem",
          color: "var(--muted)",
        }}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span>
          Я соглашаюсь с{" "}
          <Link href="/privacy-policy">Политикой конфиденциальности</Link> и даю согласие на
          обработку персональных данных
        </span>
      </label>
      <div className="hero-actions">
        <button
          type="submit"
          className="btn btn-coral"
          disabled={status === "loading" || !consent}
        >
          {status === "loading" ? "Отправка…" : "Войти по ссылке"}
        </button>
      </div>
      {message ? (
        <p
          className="hero-text"
          style={{
            marginTop: "0.75rem",
            color: status === "error" ? "var(--coral)" : "var(--muted)",
          }}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
