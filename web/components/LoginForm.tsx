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
  const [status, setStatus] = useState<"idle" | "loading" | "redirecting">("idle");
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

  async function postJsonWithTimeout(url: string, payload: unknown, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  function redirectWithFallback() {
    setStatus("redirecting");
    router.push(next);
    router.refresh();
    window.setTimeout(() => {
      if (window.location.pathname !== next) {
        window.location.assign(next);
      }
    }, 1200);
  }

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
      const res = await postJsonWithTimeout("/api/auth/login", {
        email: email.trim(),
        password,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessageTone("error");
        setMessage(typeof data.error === "string" ? data.error : "Ошибка входа");
        setStatus("idle");
        return;
      }
      redirectWithFallback();
    } catch (err) {
      setMessageTone("error");
      const msg =
        err instanceof Error && err.name === "AbortError"
          ? "Сервер долго отвечает. Попробуйте еще раз."
          : err instanceof Error
            ? err.message
            : "Ошибка входа";
      setMessage(msg);
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
      const res = await postJsonWithTimeout("/api/auth/register", {
        email: email.trim(),
        displayName: displayName.trim(),
        password,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessageTone("error");
        setMessage(typeof data.error === "string" ? data.error : "Ошибка регистрации");
        setStatus("idle");
        return;
      }
      redirectWithFallback();
    } catch (err) {
      setMessageTone("error");
      const msg =
        err instanceof Error && err.name === "AbortError"
          ? "Сервер долго отвечает. Попробуйте еще раз."
          : err instanceof Error
            ? err.message
            : "Ошибка регистрации";
      setMessage(msg);
      setStatus("idle");
    }
  }

  const busy = status !== "idle";
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
        {mode === "signin" ? (
          <p className="hero-text" style={{ marginTop: "0.5rem", marginBottom: "0" }}>
            <Link href="/forgot-password" className="text-link">
              Забыли пароль?
            </Link>
          </p>
        ) : null}
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
            {status === "redirecting"
              ? "Переходим в кабинет..."
              : busy
                ? "Отправка..."
                : mode === "signin"
                  ? "Войти"
                  : "Зарегистрироваться"}
          </button>
        </div>
      </form>


      <div style={{ margin: "1rem 0 0.25rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>или</div>
      <div className="hero-actions" style={{ justifyContent: "center" }}>
        <a
          href={`/api/auth/yandex?next=${encodeURIComponent(next)}`}
          className="btn btn-light"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#FC3F1D"/><path d="M13.32 7.2h-1.1c-1.27 0-1.94.63-1.94 1.66 0 1.17.5 1.72 1.53 2.4l.85.57-2.44 3.97H8.5l2.22-3.6c-1.28-.9-2-1.82-2-3.26 0-1.94 1.34-3.14 3.72-3.14h2.94v9.99H13.3V7.2z" fill="#fff"/></svg>
          Войти через Яндекс
        </a>
      </div>

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
