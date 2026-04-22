import { NextResponse } from "next/server";
import { isPasswordAuthConfigured } from "@/lib/auth/config";
import { hashPassword } from "@/lib/auth/password";
import { hashPasswordResetToken } from "@/lib/auth/password-reset";
import { getSql } from "@/lib/db/postgres";

type ResetRow = { id: string; account_id: string; expires_at: string; used_at: string | null };

export async function POST(req: Request) {
  if (!isPasswordAuthConfigured()) {
    return NextResponse.json({ error: "Сервер не настроен для входа." }, { status: 503 });
  }

  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");

  if (!token || password.length < 6) {
    return NextResponse.json({ error: "Нужен токен и пароль не короче 6 символов." }, { status: 400 });
  }

  try {
    const sql = getSql();
    const tokenHash = hashPasswordResetToken(token);
    const rows = (await sql`
      select id, account_id, expires_at, used_at
      from careerlab_password_resets
      where token_hash = ${tokenHash}
      limit 1
    `) as ResetRow[];

    const reset = rows[0];
    if (!reset) {
      return NextResponse.json({ error: "Ссылка недействительна." }, { status: 400 });
    }
    if (reset.used_at) {
      return NextResponse.json({ error: "Ссылка уже использована." }, { status: 400 });
    }
    if (new Date(reset.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Срок действия ссылки истёк." }, { status: 400 });
    }

    const newHash = hashPassword(password);
    await sql.begin(async (tx) => {
      await tx`
        update careerlab_accounts
        set password_hash = ${newHash}
        where id = ${reset.account_id}
      `;
      await tx`
        update careerlab_password_resets
        set used_at = now()
        where id = ${reset.id}
      `;
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}

