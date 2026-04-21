import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "./cookies";
import { tryParseAuthSession } from "./token";

function isAuthOfficePath(pathname: string): boolean {
  if (pathname === "/office") return true;
  if (pathname.startsWith("/office/")) return true;
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
  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set("next", path);
  return NextResponse.redirect(redirectUrl);
}
