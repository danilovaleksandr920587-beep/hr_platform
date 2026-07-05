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
    <div>
      <div className="company-context">
        {hasSwitcher ? (
          <label>
            Кабинет компании:{" "}
            <select
              className="company-select"
              value={activeId}
              onChange={(e) => switchCompany(e.target.value)}
            >
              {companies!.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <span>
            Кабинет компании: <strong>{companyName}</strong>
          </span>
        )}
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
