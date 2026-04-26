import { NextResponse, type NextRequest } from "next/server";
import { officeGuard } from "@/lib/auth/office-guard";

function canonicalHostRedirect(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  if (!hostname.startsWith("www.")) return null;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.hostname = hostname.slice(4);
  redirectUrl.port = "";
  return NextResponse.redirect(redirectUrl, 308);
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
  return await officeGuard(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
