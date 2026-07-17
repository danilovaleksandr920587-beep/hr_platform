"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/vuz", label: "Обзор", match: (p: string) => p === "/vuz" },
  { href: "/vuz/team", label: "Команда", match: (p: string) => p.startsWith("/vuz/team") },
  {
    href: "/vuz/settings",
    label: "Витрина",
    match: (p: string) => p.startsWith("/vuz/settings"),
  },
] as const;

/** Шапка кабинета вуза. Стили - company-portal.css (тот же контур).
 *  Переключатель активного вуза - Фаза 3 (аккаунт в нескольких ЦКС - редкость). */
export function VuzNav({ universityName }: { universityName: string }) {
  const pathname = usePathname() ?? "";

  return (
    <div>
      <div className="company-context">
        <span>
          Кабинет вуза: <strong>{universityName}</strong>
        </span>
      </div>
      <nav className="company-tabs">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`company-tab${active ? " is-active" : ""}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
