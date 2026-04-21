import { NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth/token";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/cookies";
import { verifyPassword } from "@/lib/auth/password";
import { isPasswordAuthConfigured } from "@/lib/auth/config";
import { getSql } from "@/lib/db/postgres";

type Row = { id: string; email: string; display_name: string; password_hash: string };

export async function POST(req: Request) {
  if (!isPasswordAuthConfigured()) {
    return NextResponse.json({ error: "Сервер не настроен для входа." }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Укажите email и пароль." }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = (await sql`
      select id, email, display_name, password_hash
      from careerlab_accounts
      where lower(email) = ${email}
      limit 1
    `) as Row[];
    const row = rows[0];
    if (!row || !verifyPassword(password, row.password_hash)) {
      return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
    }
    const token = await signAuthToken({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
