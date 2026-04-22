import { NextResponse } from "next/server";
import { isPasswordAuthConfigured } from "@/lib/auth/config";
import { getSql } from "@/lib/db/postgres";
import { generatePasswordResetToken } from "@/lib/auth/password-reset";
import { isSmtpConfigured, sendPasswordResetEmail } from "@/lib/email/smtp";

type AccountRow = { id: string };
type ResetRow = { created_at: string };

const GENERIC_MESSAGE =
  "Если аккаунт с таким email существует, мы отправили инструкцию по восстановлению пароля.";

export async function POST(req: Request) {
  if (!isPasswordAuthConfigured()) {
    return NextResponse.json({ error: "Сервер не настроен для входа." }, { status: 503 });
  }
  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: "Сервис восстановления временно недоступен. Обратитесь в поддержку." },
      { status: 503 },
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Укажите email." }, { status: 400 });
  }

  try {
    const sql = getSql();
    const accounts = (await sql`
      select id
      from careerlab_accounts
      where lower(email) = ${email}
      limit 1
    `) as AccountRow[];
    const account = accounts[0];

    if (!account) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const latest = (await sql`
      select created_at
      from careerlab_password_resets
      where account_id = ${account.id}
      order by created_at desc
      limit 1
    `) as ResetRow[];
    const last = latest[0];
    if (last) {
      const delta = Date.now() - new Date(last.created_at).getTime();
      if (delta < 60 * 1000) {
        return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
      }
    }

    const generated = generatePasswordResetToken();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "";

    await sql`
      insert into careerlab_password_resets (account_id, token_hash, expires_at, requested_ip)
      values (${account.id}, ${generated.tokenHash}, ${generated.expiresAtIso}, ${ip})
    `;

    const origin = new URL(req.url).origin;
    const resetUrl = `${origin}/reset-password?token=${generated.token}`;
    await sendPasswordResetEmail({ to: email, resetUrl });

    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}

