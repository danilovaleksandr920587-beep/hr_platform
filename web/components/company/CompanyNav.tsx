"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ACTIVE_COMPANY_COOKIE } from "@/lib/company/active-company-cookie";

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

export function CompanyNav({
  companyName,
  companies,
  activeId,
}: {
  companyName: string;
  companies?: { id: string; name: string }[];
  activeId?: string;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  function switchCompany(id: string) {
    // cookie читается на сервере (requireActiveCompany); не HttpOnly - ставим из клиента
    document.cookie = `${ACTIVE_COMPANY_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  const hasSwitcher = companies && companies.length > 1;

  return (
    <div style={{ marginBottom: 24 }}>
      {hasSwitcher ? (
        <label style={{ display: "block", margin: "0 0 10px", color: "var(--muted, #666)", fontSize: 14 }}>
          Кабинет компании:{" "}
          <select
            value={activeId}
            onChange={(e) => switchCompany(e.target.value)}
            style={{
              font: "inherit",
              fontSize: 14,
              fontWeight: 600,
              padding: "0.2rem 0.4rem",
              borderRadius: 8,
              border: "1px solid var(--border2, #ddd)",
            }}
          >
            {companies!.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      ) : (
        <p style={{ margin: "0 0 10px", color: "var(--muted, #666)", fontSize: 14 }}>
          Кабинет компании: <strong>{companyName}</strong>
        </p>
      )}
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
