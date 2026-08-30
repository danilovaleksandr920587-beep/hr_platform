import { NextResponse, type NextRequest } from "next/server";
import { officeGuard } from "@/lib/auth/office-guard";
import { attachAnalyticsIdentity } from "@/lib/analytics/middleware-identity";

function canonicalHostRedirect(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  if (!hostname.startsWith("www.")) return null;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.hostname = hostname.slice(4);
  redirectUrl.port = "";
  return NextResponse.redirect(redirectUrl, 308);
}

/**
 * Поддомен внутренней аналитики: stats.lab-career.ru показывает тот же Next,
 * но корень ведёт на /admin/analytics. Отдельного деплоя и второй авторизации
 * не заводим - это тот же процесс и та же сессия.
 *
 * Служебные пути (/admin, /api, /_next, /login) не переписываем: логин и сам
 * раздел должны работать на поддомене как есть.
 */
const STATS_HOST = "stats.lab-career.ru";
const STATS_PASSTHROUGH = ["/admin", "/api", "/_next", "/login", "/favicon.ico"];

function isStatsHost(request: NextRequest): boolean {
  return request.nextUrl.hostname === STATS_HOST;
}

function statsSubdomainRewrite(request: NextRequest) {
  if (!isStatsHost(request)) return null;
  const { pathname } = request.nextUrl;
  if (STATS_PASSTHROUGH.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/admin/analytics" : `/admin/analytics${pathname}`;
  return NextResponse.rewrite(url);
}

function legacyHtmlRedirect(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/vacancy.html") {
    const slug = searchParams.get("slug") ?? searchParams.get("id");
    if (slug) {
      const u = request.nextUrl.clone();
      u.pathname = `/vacancies/${slug}`;
      u.search = "";
      return NextResponse.redirect(u, 308);
    }
  }

  if (pathname === "/kb-article.html") {
    const slug = searchParams.get("id") ?? searchParams.get("slug");
    if (slug) {
      const u = request.nextUrl.clone();
      u.pathname = `/knowledge-base/${slug}`;
      u.search = "";
      return NextResponse.redirect(u, 308);
    }
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const canonical = canonicalHostRedirect(request);
  if (canonical) return canonical;

  const legacy = legacyHtmlRedirect(request);
  if (legacy) return legacy;

  const stats = statsSubdomainRewrite(request);
  const response = stats ?? (await officeGuard(request));
  // Поддомен со статистикой не должен попасть в индекс ни одной страницей.
  if (isStatsHost(request)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  // Куки внутренней аналитики вешаем на итоговый ответ - в том числе на
  // редирект гостя из кабинета: визит начался, даже если страницу не отдали.
  return attachAnalyticsIdentity(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
