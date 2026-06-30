"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DISMISS_KEY = "tg_bar_dismissed_until";
const DISMISS_DAYS = 14;
const SCROLL_TRIGGER = 0.4; // показываем после 40% прокрутки
const HIDDEN_PREFIXES = [
  "/login",
  "/office",
  "/forgot-password",
  "/reset-password",
  "/consent",
];

// Каналы по контексту страницы.
const VACANCIES_CHANNEL = {
  href: "https://t.me/+hpXZFOXYKjVjYzJi",
  text: "Свежие junior-вакансии и стажировки в Telegram",
  goal: "tg_sticky_vacancy",
};
const ARTICLES_CHANNEL = {
  href: "https://t.me/+5_kVFlw51rVjYzhi",
  text: "Зарплаты в IT и истории стажёров — в Telegram",
  goal: "tg_sticky_article",
};

const YM_ID = 108774421;

export function TgStickyBar() {
  const pathname = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  const channel = pathname.startsWith("/vacancies")
    ? VACANCIES_CHANNEL
    : ARTICLES_CHANNEL;

  useEffect(() => {
    setMounted(true);
    setVisible(false);

    if (hidden) return;

    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (until && Date.now() < until) return;
    } catch {
      // localStorage недоступен — просто покажем по скроллу
    }

    const onScroll = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      if (window.scrollY / scrollable > SCROLL_TRIGGER) {
        setVisible(true);
        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, hidden]);

  function dismiss() {
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000),
      );
    } catch {
      // игнорируем
    }
    setVisible(false);
  }

  function handleClick() {
    try {
      (window as unknown as { ym?: (...args: unknown[]) => void }).ym?.(
        YM_ID,
        "reachGoal",
        channel.goal,
      );
    } catch {
      // метрика не загрузилась — не критично
    }
  }

  if (!mounted || hidden) return null;

  return (
    <div
      role="complementary"
      aria-label="Подписка на Telegram"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        transform: visible ? "translateY(0)" : "translateY(110%)",
        transition: "transform 0.32s ease",
        pointerEvents: visible ? "auto" : "none",
        background: "#0d0f08",
        padding: "10px 14px calc(10px + env(safe-area-inset-bottom, 0px))",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "#229ED9",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
          <path d="M21.94 4.66a1 1 0 0 0-1.05-.16L3.4 11.62c-.86.35-.8 1.6.09 1.86l4.3 1.28 1.62 4.95c.25.74 1.2.93 1.72.35l2.27-2.53 4.36 3.2c.6.44 1.46.11 1.6-.62l2.86-14.4a1 1 0 0 0-.28-.91ZM9.7 14.1l8.2-5.1-6.73 6.18a1 1 0 0 0-.31.6l-.27 2.02-.9-3.27a.4.4 0 0 1 .01-.43Z" />
        </svg>
      </span>

      <a
        href={channel.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        style={{
          flex: 1,
          minWidth: 0,
          color: "#fff",
          fontSize: 13,
          lineHeight: 1.3,
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        {channel.text}
      </a>

      <a
        href={channel.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        style={{
          flexShrink: 0,
          background: "#c9f135",
          color: "#0d0f08",
          fontSize: 13,
          fontWeight: 600,
          padding: "8px 16px",
          borderRadius: 999,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Подписаться
      </a>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Закрыть"
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "none",
          color: "#7a7d70",
          fontSize: 20,
          lineHeight: 1,
          padding: "4px 4px",
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}
