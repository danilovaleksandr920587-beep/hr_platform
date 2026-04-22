import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const next = searchParams.get("next") ?? "/office";

  const clientId = process.env.YANDEX_CLIENT_ID;
  const redirectUri = process.env.YANDEX_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL("/login?error=auth", req.url));
  }

  const state = Buffer.from(JSON.stringify({ p: "yandex", next })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`https://oauth.yandex.ru/authorize?${params}`);
}
