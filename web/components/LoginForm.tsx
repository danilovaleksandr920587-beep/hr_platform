"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function safeNextPath(raw: string | undefined) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/office";
  return raw;
}

type Mode = "signin" | "signup";

export function LoginForm({
  nextPath,
  configured,
}: {
  nextPath: string;
  configured: boolean;
}) {
  const router = useRouter();
  const next = useMemo(() => safeNextPath(nextPath), [nextPath]);
  const [mode, setMode] = useState<Mode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"muted" | "error" | "ok">("muted");
  const [consent, setConsent] = useState(false);

  const inputStyle = useMemo(
    () => ({
      width: "100%" as const,
      marginTop: 6,
      padding: "0.55rem 0.65rem",
      borderRadius: 10,
      border: "1px solid var(--border2)",
      font: "inherit" as const,
    }),
    [],
  );

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!configured) {
      setMessageTone("error");
      setMessage("Задайте DATABASE_URL и AUTH_SECRET (не короче 32 символов).");
      return;
    }
    if (!consent) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessageTone("error");
        setMessage(typeof data.error === "string" ? data.error : "Ошибка входа");
        setStatus("idle");
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setMessageTone("error");
      setMessage(err instanceof Error ? err.message : "Ошибка входа");
      setStatus("idle");
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!configured) {
      setMessageTone("error");
      setMessage("Задайте DATABASE_URL и AUTH_SECRET (не короче 32 символов).");
      return;
    }
    if (!consent) return;
    if (!displayName.trim()) {
      setMessageTone("error");
      setMessage("Укажите имя.");
      return;
    }
    if (password.length < 6) {
      setMessageTone("error");
      setMessage("Пароль не короче 6 символов.");
      return;
    }
    if (password !== password2) {
      setMessageTone("error");
      setMessage("Пароли не совпадают.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessageTone("error");
        setMessage(typeof data.error === "string" ? data.error : "Ошибка регистрации");
        setStatus("idle");
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setMessageTone("error");
      setMessage(err instanceof Error ? err.message : "Ошибка регистрации");
      setStatus("idle");
    }
  }

  const busy = status === "loading";
  const canSubmit =
    consent &&
    !busy &&
    Boolean(email.trim() && password) &&
    (mode === "signin" || (displayName.trim() && password2.length >= 6));

  return (
    <div className="panel" style={{ marginTop: "1rem" }}>
      <div className="hero-actions" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className={mode === "signin" ? "btn btn-coral" : "btn btn-light"}
          onClick={() => {
            setMode("signin");
            setMessage(null);
          }}
        >
          Вход
        </button>
        <button
          type="button"
          className={mode === "signup" ? "btn btn-coral" : "btn btn-light"}
          onClick={() => {
            setMode("signup");
            setMessage(null);
          }}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>
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
            style={inputStyle}
          />
        </label>
        {mode === "signup" ? (
          <label className="filter-inline" style={{ width: "100%", marginTop: "0.75rem" }}>
            Имя
            <input
              type="text"
              name="displayName"
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Как к вам обращаться"
              maxLength={200}
              style={inputStyle}
            />
          </label>
        ) : null}
        <label className="filter-inline" style={{ width: "100%", marginTop: "0.75rem" }}>
          Пароль
          <input
            type="password"
            name="password"
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            style={inputStyle}
          />
        </label>
        {mode === "signup" ? (
          <label className="filter-inline" style={{ width: "100%", marginTop: "0.75rem" }}>
            Пароль ещё раз
            <input
              type="password"
              name="password2"
              required
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              style={inputStyle}
            />
          </label>
        ) : null}

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: "0.85rem",
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
          <button type="submit" className="btn btn-coral" disabled={!canSubmit}>
            {busy ? "Отправка…" : mode === "signin" ? "Войти" : "Зарегистрироваться"}
          </button>
        </div>
      </form>

      {message ? (
        <p
          className="hero-text"
          style={{
            marginTop: "0.75rem",
            color:
              messageTone === "error"
                ? "var(--coral)"
                : messageTone === "ok"
                  ? "var(--muted)"
                  : "var(--muted)",
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
