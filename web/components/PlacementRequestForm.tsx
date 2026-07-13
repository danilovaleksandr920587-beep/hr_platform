"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SUPPORT_EMAIL } from "@/lib/support";

const PACKAGES = ["Размещение", "Бутик", "Сезон"] as const;

type Status = "idle" | "sending" | "done" | "error";

/**
 * Кнопка-триггер заявки на размещение. Открывает модалку с формой вместо
 * mailto: заявка уходит через /api/placement-request. Пакет предзаполняется
 * из того, что нажали.
 */
export function PlacementButton({
  packageName,
  className,
  children,
}: {
  packageName: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? (
        <PlacementModal
          defaultPackage={packageName}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function PlacementModal({
  defaultPackage,
  onClose,
}: {
  defaultPackage: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    company: "",
    contact: "",
    packageName: defaultPackage,
    message: "",
    website: "", // honeypot
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.company.trim() || !form.contact.trim()) {
      setError("Заполните название компании и контакт.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/placement-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setStatus("error");
        setError(data.error || "Не удалось отправить. Попробуйте ещё раз.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Сеть недоступна. Попробуйте ещё раз.");
    }
  }

  return createPortal(
    <div
      className="pr-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Заявка на размещение"
      onClick={onClose}
    >
      <div className="pr-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="pr-close"
          aria-label="Закрыть"
          onClick={onClose}
        >
          ×
        </button>

        {status === "done" ? (
          <div className="pr-done">
            <div className="pr-done-check" aria-hidden="true">
              ✓
            </div>
            <p className="pr-title">Заявка отправлена</p>
            <p className="pr-sub">
              Ответим в тот же рабочий день и соберём пакет под вашу задачу.
            </p>
            <button type="button" className="fc-btn-dark" onClick={onClose}>
              Готово
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="pr-form" noValidate>
            <p className="pr-title">Заявка на размещение</p>
            <p className="pr-sub">
              Ответим в тот же рабочий день. Ни к чему не обязывает.
            </p>

            <label className="pr-field">
              <span>Пакет</span>
              <select
                value={form.packageName}
                onChange={(e) => update("packageName", e.target.value)}
              >
                {PACKAGES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="pr-field">
              <span>Компания *</span>
              <input
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                placeholder="Название компании"
                autoComplete="organization"
                autoFocus
              />
            </label>

            <label className="pr-field">
              <span>Контакт *</span>
              <input
                value={form.contact}
                onChange={(e) => update("contact", e.target.value)}
                placeholder="Email, Telegram или телефон"
              />
            </label>

            <label className="pr-field">
              <span>Что нужно (необязательно)</span>
              <textarea
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                rows={3}
                placeholder="Какие вакансии, сколько людей, сроки…"
              />
            </label>

            {/* honeypot: скрыто от людей, ловит ботов */}
            <input
              className="pr-hp"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
            />

            {error ? <p className="pr-error">{error}</p> : null}

            <button
              type="submit"
              className="fc-btn-dark pr-submit"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Отправляем…" : "Отправить заявку"}
            </button>
            <p className="pr-alt">
              или напишите на{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
