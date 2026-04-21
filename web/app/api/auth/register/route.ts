import { NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth/token";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/cookies";
import { hashPassword } from "@/lib/auth/password";
import { isPasswordAuthConfigured } from "@/lib/auth/config";
import { getSql } from "@/lib/db/postgres";

type Row = { id: string; email: string; display_name: string };

export async function POST(req: Request) {
  if (!isPasswordAuthConfigured()) {
    return NextResponse.json({ error: "Сервер не настроен для входа." }, { status: 503 });
  }

  let body: { email?: string; displayName?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(body.displayName ?? "").trim().slice(0, 200);
  const password = String(body.password ?? "");

  if (!email || !displayName || password.length < 6) {
    return NextResponse.json({ error: "Укажите email, имя и пароль не короче 6 символов." }, { status: 400 });
  }

  const hash = hashPassword(password);
  try {
    const sql = getSql();
    const rows = (await sql`
      insert into careerlab_accounts (email, display_name, password_hash)
      values (${email}, ${displayName}, ${hash})
      returning id, email, display_name
    `) as Row[];
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Не удалось создать аккаунт." }, { status: 500 });
    }
    const token = await signAuthToken({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return res;
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      return NextResponse.json({ error: "Аккаунт с таким email уже есть." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
