"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/company", label: "Обзор", match: (p: string) => p === "/company" },
  {
    href: "/company/vacancies",
    label: "Вакансии",
    match: (p: string) => p.startsWith("/company/vacancies"),
  },
  {
    href: "/company/applications",
    label: "Отклики",
    match: (p: string) => p.startsWith("/company/applications"),
  },
  { href: "/company/team", label: "Команда", match: (p: string) => p.startsWith("/company/team") },
  {
    href: "/company/settings",
    label: "Настройки",
    match: (p: string) => p.startsWith("/company/settings"),
  },
] as const;

export function CompanyNav({ companyName }: { companyName: string }) {
  const pathname = usePathname() ?? "";
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ margin: "0 0 10px", color: "var(--muted, #666)", fontSize: 14 }}>
        Кабинет компании: <strong>{companyName}</strong>
      </p>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: 999,
                textDecoration: "none",
                font: "inherit",
                fontSize: 14,
                border: "1px solid var(--border2, #ddd)",
                background: active ? "var(--ink, #1e2114)" : "transparent",
                color: active ? "#fff" : "inherit",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
