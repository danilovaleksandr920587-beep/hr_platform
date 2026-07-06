import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE_NAME, oauthStateCookieOptions } from "@/lib/auth/cookies";

function safeNext(raw: string | null, fallback = "/office") {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const next = safeNext(searchParams.get("next"));

  const clientId = process.env.YANDEX_CLIENT_ID;
  const redirectUri = process.env.YANDEX_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL("/login?error=auth", req.url));
  }

  // Nonce против login CSRF: кладём в httpOnly cookie и в state,
  // callback сверяет их (иначе жертве можно подсунуть чужой code)
  const nonce = randomBytes(16).toString("base64url");
  const state = Buffer.from(JSON.stringify({ p: "yandex", next, nonce })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  const res = NextResponse.redirect(`https://oauth.yandex.ru/authorize?${params}`);
  res.cookies.set(OAUTH_STATE_COOKIE_NAME, nonce, oauthStateCookieOptions());
  return res;
}
