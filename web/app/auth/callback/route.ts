import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getSql } from "@/lib/db/postgres";
import { signAuthToken } from "@/lib/auth/token";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/cookies";
import { isPasswordAuthConfigured } from "@/lib/auth/config";

function safeNext(raw: string | null, fallback = "/office") {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

async function getRealOrigin(): Promise<string> {
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "lab-career.ru";
  const scheme = proto.split(",")[0].trim();
  return `${scheme}://${host}`;
}

async function handleYandex(code: string, next: string): Promise<NextResponse> {
  const origin = await getRealOrigin();
  const clientId = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;
  const redirectUri = process.env.YANDEX_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri || !isPasswordAuthConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const tokenRes = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const infoRes = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });

  if (!infoRes.ok) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const info = (await infoRes.json()) as {
    id?: string;
    default_email?: string;
    real_name?: string;
    display_name?: string;
    login?: string;
  };

  const yandexId = info.id;
  const email = (info.default_email ?? "").toLowerCase().trim();
  const displayName = (info.real_name ?? info.display_name ?? info.login ?? email).trim().slice(0, 200);

  if (!yandexId || !email) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const sql = getSql();
  type Row = { id: string; email: string; display_name: string };

  const rows = (await sql`
    insert into careerlab_accounts (email, display_name, password_hash)
    values (${email}, ${displayName}, ${"oauth:yandex:" + yandexId})
    on conflict (email) do update
      set display_name = excluded.display_name
    returning id, email, display_name
  `) as Row[];

  const row = rows[0];
  if (!row) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const token = await signAuthToken({ id: row.id, email: row.email, displayName: row.display_name });
  const res = NextResponse.redirect(`${origin}${next}`);
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return res;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state");

  const origin = await getRealOrigin();

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Yandex: state содержит {p:"yandex", next:...}
  if (rawState) {
    try {
      const state = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8")) as {
        p?: string;
        next?: string;
      };
      if (state.p === "yandex") {
        return handleYandex(code, safeNext(state.next ?? null));
      }
    } catch {
      // не Яндекс — идём дальше
    }
  }

  const next = safeNext(searchParams.get("next"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
