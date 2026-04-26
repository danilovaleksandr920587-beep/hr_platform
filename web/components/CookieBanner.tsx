"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const consent = window.localStorage.getItem(STORAGE_KEY);
      if (!consent) setVisible(true);
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  function handleConsent(value: "accepted" | "declined") {
    window.localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        inset: "auto 0 0 0",
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        padding: "0.75rem 1rem 1rem",
        pointerEvents: "none",
      }}
    >
      <div
        role="dialog"
        aria-label="Уведомление о cookie"
        className="panel"
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 640,
          boxShadow: "0 10px 36px rgba(24, 30, 45, 0.12)",
          padding: "1rem 1.1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: "0.85rem 1rem",
          }}
        >
          <p className="hero-text" style={{ margin: 0, flex: "1 1 220px", maxWidth: "none" }}>
            Мы используем файлы cookie для работы сайта и аналитики. Нажимая «Принять», вы
            соглашаетесь с их использованием и{" "}
            <Link href="/privacy-policy">Политикой конфиденциальности</Link>.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginLeft: "auto",
            }}
          >
            <button type="button" className="btn btn-light" onClick={() => handleConsent("declined")}>
              Отклонить
            </button>
            <button type="button" className="btn btn-coral" onClick={() => handleConsent("accepted")}>
              Принять
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
