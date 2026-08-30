"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/client/track";

/**
 * page_view на каждую смену маршрута. Живёт в корневом layout.
 *
 * usePathname, а не useSearchParams: второй заставляет Next оборачивать все
 * статические страницы в Suspense и рендерить их на клиенте, а query-строка
 * нужна только для utm - её очередь читает сама из location.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
