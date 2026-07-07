"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

function messageFor(n: Notification): { text: string; href: string } {
  const p = n.payload ?? {};
  const s = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  switch (n.type) {
    case "application_new":
      return {
        text: `Новый отклик на «${s("vacancyTitle")}»${s("applicantName") ? ` от ${s("applicantName")}` : ""}`,
        href: "/company/applications?status=new",
      };
    case "application_status":
      return {
        text:
          p.status === "invited"
            ? `Приглашение от ${s("companyName")} по «${s("vacancyTitle")}»`
            : `Ответ по «${s("vacancyTitle")}»${s("companyName") ? ` от ${s("companyName")}` : ""}`,
        href: "/office/applications",
      };
    case "company_moderation":
      return {
        text: p.approved
          ? `Компания «${s("companyName")}» подтверждена`
          : `Компания «${s("companyName")}» не прошла проверку`,
        href: "/company",
      };
    case "vacancy_moderation":
      return {
        text: p.approved
          ? `Вакансия «${s("vacancyTitle")}» опубликована`
          : `Вакансия «${s("vacancyTitle")}» не прошла модерацию`,
        href: p.approved ? `/vacancies/${s("vacancySlug")}` : `/company/vacancies/${s("vacancySlug")}`,
      };
    default:
      return { text: "Уведомление", href: "/office" };
  }
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  return `${days} дн назад`;
}

export function NotificationBell() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { items: Notification[]; unread: number };
      setAuthed(true);
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // сеть недоступна - тихо
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Поллинг раз в 60 сек, только если залогинен и вкладка активна
  useEffect(() => {
    if (authed !== true) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    return () => clearInterval(timer);
  }, [authed, load]);

  // Клик вне дропдауна закрывает
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      try {
        await fetch("/api/notifications/read", { method: "POST" });
      } catch {
        // не критично
      }
    }
  }

  if (authed !== true) return null;

  return (
    <div ref={boxRef} className="notification-bell">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Уведомления${unread ? `, непрочитанных: ${unread}` : ""}`}
        className="notification-bell-trigger"
      >
        <span aria-hidden className="notification-bell-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </span>
        {unread > 0 && <span className="notification-bell-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notification-bell-panel">
          <div className="notification-bell-title">Уведомления</div>
          {!items.length ? (
            <p className="notification-bell-empty">Пока пусто.</p>
          ) : (
            items.map((n) => {
              const { text, href } = messageFor(n);
              return (
                <a
                  key={n.id}
                  href={href}
                  className={`notification-bell-item${n.read_at ? "" : " is-unread"}`}
                >
                  <div className="notification-bell-item-text">{text}</div>
                  <div className="notification-bell-item-time">{timeAgo(n.created_at)}</div>
                </a>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
