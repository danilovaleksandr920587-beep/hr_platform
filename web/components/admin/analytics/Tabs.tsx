"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/analytics", label: "Обзор" },
  { href: "/admin/analytics/directions", label: "Направления" },
  { href: "/admin/analytics/content", label: "Контент" },
];

export function AnalyticsTabs() {
  const pathname = usePathname();
  return (
    <div className="an-tabs">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`an-tab${pathname === t.href ? " is-active" : ""}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
