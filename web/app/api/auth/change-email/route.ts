import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getSql } from "@/lib/db/postgres";
import { verifyPassword } from "@/lib/auth/password";
import { getRealOrigin } from "@/lib/http/origin";
import { getClientIp } from "@/lib/http/client-ip";
import { issueEmailVerification } from "@/lib/auth/account-verification";
import { isSmtpConfigured } from "@/lib/email/smtp";

type AccountRow = { email: string; password_hash: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: "Отправка писем временно недоступна. Попробуйте позже." },
      { status: 503 },
    );
  }

  let body: { newEmail?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const newEmail = String(body.newEmail ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!EMAIL_RE.test(newEmail)) {
    return NextResponse.json({ error: "Укажите корректный email." }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = (await sql`
      select email, password_hash from careerlab_accounts where id = ${session.id} limit 1
    `) as AccountRow[];
    const account = rows[0];
    if (!account) return NextResponse.json({ error: "Аккаунт не найден." }, { status: 404 });

    // OAuth-аккаунты (password_hash = "oauth:...") паролем не управляются.
    if (!account.password_hash.startsWith("scl$")) {
      return NextResponse.json(
        { error: "Смена email недоступна для аккаунтов Яндекс - email управляется в Яндекс ID." },
        { status: 400 },
      );
    }
    if (!verifyPassword(password, account.password_hash)) {
      return NextResponse.json({ error: "Неверный пароль." }, { status: 403 });
    }
    if (newEmail === account.email.toLowerCase()) {
      return NextResponse.json({ error: "Это ваш текущий email." }, { status: 400 });
    }

    const taken = (await sql`
      select 1 as one from careerlab_accounts where lower(email) = ${newEmail} limit 1
    `) as { one: number }[];
    if (taken.length) {
      return NextResponse.json({ error: "Этот email уже занят." }, { status: 409 });
    }

    // Троттлинг смены адреса.
    const latest = (await sql`
      select created_at from careerlab_email_verifications
      where account_id = ${session.id} and new_email is not null
      order by created_at desc limit 1
    `) as { created_at: string }[];
    if (latest[0] && Date.now() - new Date(latest[0].created_at).getTime() < 60 * 1000) {
      return NextResponse.json(
        { error: "Письмо уже отправлено. Подождите минуту." },
        { status: 429 },
      );
    }

    const origin = await getRealOrigin();
    await issueEmailVerification({
      accountId: session.id,
      sendTo: newEmail,
      origin,
      newEmail,
      ip: getClientIp(req),
    });

    return NextResponse.json({
      ok: true,
      message: `Письмо для подтверждения отправлено на ${newEmail}. Адрес сменится после перехода по ссылке.`,
    });
  } catch (e) {
    console.error("[change-email]", e);
    return NextResponse.json({ error: "Не удалось сменить email." }, { status: 500 });
  }
}
