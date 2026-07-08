"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

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
        consent,
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
    <div className="auth-card">
      <div className="auth-brand">
        <div className="auth-logo">C</div>
        <h1 className="auth-title">Вход в CareerLab</h1>
        <p className="auth-subtitle">Кабинет, отклики и разборы резюме</p>
      </div>

      <div className="auth-toggle" role="tablist" aria-label="Режим">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          className={`auth-toggle-btn${mode === "signin" ? " active" : ""}`}
          onClick={() => {
            setMode("signin");
            setMessage(null);
          }}
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={`auth-toggle-btn${mode === "signup" ? " active" : ""}`}
          onClick={() => {
            setMode("signup");
            setMessage(null);
          }}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>
        {mode === "signup" ? (
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="auth-name">Имя</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><UserIcon /></span>
              <input
                id="auth-name"
                className="auth-input"
                type="text"
                name="displayName"
                required
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Как к вам обращаться"
                maxLength={200}
              />
            </div>
          </div>
        ) : null}

        <div className="auth-field">
          <label className="auth-field-label" htmlFor="auth-email">Email</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><MailIcon /></span>
            <input
              id="auth-email"
              className="auth-input"
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-field-label" htmlFor="auth-password">Пароль</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><LockIcon /></span>
            <input
              id="auth-password"
              className="auth-input"
              type="password"
              name="password"
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </div>
        </div>

        {mode === "signin" ? (
          <div className="auth-forgot">
            <Link href="/forgot-password">Забыли пароль?</Link>
          </div>
        ) : null}

        {mode === "signup" ? (
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="auth-password2">Пароль ещё раз</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><LockIcon /></span>
              <input
                id="auth-password2"
                className="auth-input"
                type="password"
                name="password2"
                required
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>
        ) : null}

        <label className="auth-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            Я соглашаюсь с{" "}
            <Link href="/privacy-policy">Политикой конфиденциальности</Link>{" "}и даю{" "}
            <Link href="/consent">согласие на обработку персональных данных</Link>
          </span>
        </label>

        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {status === "redirecting"
            ? "Переходим в кабинет..."
            : busy
              ? "Отправка..."
              : mode === "signin"
                ? "Войти"
                : "Зарегистрироваться"}
        </button>
      </form>

      <div className="auth-divider">или</div>

      <a
        href={`/api/auth/yandex?next=${encodeURIComponent(next)}`}
        className="auth-yandex"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#FC3F1D"/><path d="M13.32 7.2h-1.1c-1.27 0-1.94.63-1.94 1.66 0 1.17.5 1.72 1.53 2.4l.85.57-2.44 3.97H8.5l2.22-3.6c-1.28-.9-2-1.82-2-3.26 0-1.94 1.34-3.14 3.72-3.14h2.94v9.99H13.3V7.2z" fill="#fff"/></svg>
        Войти через Яндекс
      </a>

      <p className="auth-switch">
        {mode === "signin" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMessage(null);
          }}
        >
          {mode === "signin" ? "Зарегистрироваться" : "Войти"}
        </button>
      </p>

      {message ? (
        <p className={`auth-message ${messageTone === "error" ? "error" : "muted"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
