"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

const NAV = [
  { href: "/", label: "Главная", match: (p: string) => p === "/" },
  {
    href: "/vacancies",
    label: "Вакансии",
    match: (p: string) => p.startsWith("/vacancies"),
  },
  {
    href: "/knowledge-base",
    label: "База знаний",
    match: (p: string) => p.startsWith("/knowledge-base"),
  },
  { href: "/research", label: "Исследования", match: (p: string) => p === "/research" },
  {
    href: "/office",
    label: "Личный кабинет",
    match: (p: string) => p.startsWith("/office") || p.startsWith("/login"),
  },
] as const;

function linkClass(active: boolean) {
  return active ? "cl-topbar-link cl-topbar-link--active" : "cl-topbar-link";
}

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const drawerId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = () => {
      if (mq.matches) close();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="cl-topbar">
      <div className="cl-topbar-inner">
        <Link href="/" className="cl-brand" aria-label="CareerLab — на главную" onClick={close}>
          <span className="cl-brand-mark">C</span>
          <span className="cl-brand-name">CareerLab</span>
        </Link>

        <nav className="cl-topbar-nav cl-topbar-nav--desktop" aria-label="Меню">
          {NAV.map(({ href, label, match }) => (
            <Link
              key={href}
              href={href}
              className={linkClass(match(pathname))}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="cl-topbar-actions">
          <button
            type="button"
            className="cl-topbar-menu-btn"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={open}
            aria-controls={drawerId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="cl-topbar-menu-icon" aria-hidden />
          </button>
          <Link className="cl-topbar-cta" href="/office" onClick={close}>
            В кабинет
          </Link>
        </div>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="cl-topbar-backdrop"
            aria-label="Закрыть меню"
            onClick={close}
          />
          <div
            id={drawerId}
            className="cl-topbar-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Разделы сайта"
          >
            <nav className="cl-topbar-drawer-nav" aria-label="Меню">
              {NAV.map(({ href, label, match }) => (
                <Link
                  key={href}
                  href={href}
                  className={linkClass(match(pathname))}
                  onClick={close}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="cl-topbar-drawer-cta">
              <Link className="cl-topbar-cta" href="/office" onClick={close}>
                В кабинет
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
