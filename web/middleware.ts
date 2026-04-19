import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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
  const legacy = legacyHtmlRedirect(request);
  if (legacy) return legacy;
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
