import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "./cookies";
import { tryParseAuthSession } from "./token";

function isAuthOfficePath(pathname: string): boolean {
  if (pathname === "/office") return true;
  if (pathname.startsWith("/office/")) return true;
  // Кабинет компании и модерация тоже требуют сессию
  // (роль/членство проверяются на страницах и в API)
  if (pathname === "/company") return true;
  if (pathname.startsWith("/company/")) return true;
  if (pathname === "/company-invite") return true;
  // Кабинет вуза - тот же паттерн
  if (pathname === "/vuz") return true;
  if (pathname.startsWith("/vuz/")) return true;
  if (pathname === "/vuz-invite") return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  return false;
}

export async function officeGuard(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname;
  if (!isAuthOfficePath(path)) {
    return NextResponse.next({ request });
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await tryParseAuthSession(token);
  if (session) {
    return NextResponse.next({ request });
  }

  const redirectUrl = request.nextUrl.clone();
  const next = path + request.nextUrl.search;
  redirectUrl.pathname = "/login";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("next", next);
  return NextResponse.redirect(redirectUrl);
}
