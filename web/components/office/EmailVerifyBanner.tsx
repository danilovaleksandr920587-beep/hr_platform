"use client";

import { useState } from "react";

type Props = {
  email: string;
  verifyStatus?: string;
};

const STATUS_TEXT: Record<string, string> = {
  ok: "Email подтверждён. Спасибо!",
  email_changed: "Новый email подтверждён и сохранён.",
  expired: "Ссылка подтверждения истекла - отправьте письмо заново.",
  used: "Ссылка уже использована.",
  invalid: "Ссылка подтверждения недействительна.",
  taken: "Этот email уже занят другим аккаунтом.",
  error: "Не удалось подтвердить email. Попробуйте ещё раз.",
};

export function EmailVerifyBanner({ email, verifyStatus }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  async function resend() {
    setState("sending");
    setMsg("");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setState("sent");
      } else {
        setState("error");
        setMsg(data.error || "Не удалось отправить письмо.");
      }
    } catch {
      setState("error");
      setMsg("Сеть недоступна. Попробуйте позже.");
    }
  }

  return (
    <div
      role="alert"
      style={{
        margin: "0 0 16px",
        padding: "12px 16px",
        borderRadius: 10,
        background: "#fff7e6",
        border: "1px solid #f0c36d",
        color: "#5a4300",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <strong>Подтвердите email.</strong> Мы отправили письмо на <strong>{email}</strong>.
      Пока адрес не подтверждён, нельзя откликаться на вакансии. Проверьте входящие и папку «Спам».
      {verifyStatus && STATUS_TEXT[verifyStatus] ? (
        <div style={{ marginTop: 6 }}>{STATUS_TEXT[verifyStatus]}</div>
      ) : null}
      <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending" || state === "sent"}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: state === "sent" ? "#8a8a8a" : "#1e2114",
            color: "#fff",
            cursor: state === "sending" || state === "sent" ? "default" : "pointer",
            fontSize: 14,
          }}
        >
          {state === "sending" ? "Отправляем…" : state === "sent" ? "Письмо отправлено" : "Отправить письмо повторно"}
        </button>
        {msg ? <span style={{ color: "#a13d3d" }}>{msg}</span> : null}
      </div>
    </div>
  );
}
