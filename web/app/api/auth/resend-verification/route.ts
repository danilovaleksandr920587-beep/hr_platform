import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getSql } from "@/lib/db/postgres";
import { getRealOrigin } from "@/lib/http/origin";
import { getClientIp } from "@/lib/http/client-ip";
import { issueEmailVerification } from "@/lib/auth/account-verification";
import { isSmtpConfigured } from "@/lib/email/smtp";

type AccountRow = { email: string; email_verified: boolean };

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: "Отправка писем временно недоступна. Попробуйте позже." },
      { status: 503 },
    );
  }

  try {
    const sql = getSql();
    const rows = (await sql`
      select email, email_verified from careerlab_accounts where id = ${session.id} limit 1
    `) as AccountRow[];
    const account = rows[0];
    if (!account) return NextResponse.json({ error: "Аккаунт не найден." }, { status: 404 });

    if (account.email_verified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    // Троттлинг: не чаще раза в 60 секунд (по последнему письму подтверждения).
    const latest = (await sql`
      select created_at from careerlab_email_verifications
      where account_id = ${session.id} and new_email is null
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
      sendTo: account.email,
      origin,
      ip: getClientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[resend-verification]", e);
    return NextResponse.json({ error: "Не удалось отправить письмо." }, { status: 500 });
  }
}
