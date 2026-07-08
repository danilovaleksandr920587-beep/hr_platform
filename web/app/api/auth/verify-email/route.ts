import "server-only";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/db/postgres";
import { hashEmailVerificationToken } from "@/lib/auth/email-verification";
import { getRealOrigin } from "@/lib/http/origin";
import { sendWelcomeEmail } from "@/lib/email/smtp";
import { signAuthToken } from "@/lib/auth/token";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/cookies";
import { getSessionFromCookies } from "@/lib/auth/session";

type Row = {
  id: string;
  account_id: string;
  new_email: string | null;
  expires_at: string;
  used_at: string | null;
};

// Ссылка из письма открывается в браузере -> обрабатываем GET и редиректим.
export async function GET(req: Request) {
  const origin = await getRealOrigin();
  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/office?verify=${reason}`);

  if (!token) return fail("invalid");

  try {
    const sql = getSql();
    const tokenHash = hashEmailVerificationToken(token);
    const rows = (await sql`
      select id, account_id, new_email, expires_at, used_at
      from careerlab_email_verifications
      where token_hash = ${tokenHash}
      limit 1
    `) as Row[];

    const v = rows[0];
    if (!v) return fail("invalid");
    if (v.used_at) return fail("used");
    if (new Date(v.expires_at).getTime() < Date.now()) return fail("expired");

    let changedEmail: string | null = null;
    try {
      await sql.begin(async (tx) => {
        if (v.new_email) {
          // Смена email: адрес меняется на подтверждённый новый и считается verified.
          await tx`
            update careerlab_accounts
            set email = ${v.new_email}, email_verified = true, email_verified_at = now()
            where id = ${v.account_id}
          `;
          changedEmail = v.new_email;
        } else {
          await tx`
            update careerlab_accounts
            set email_verified = true, email_verified_at = now()
            where id = ${v.account_id}
          `;
        }
        await tx`
          update careerlab_email_verifications set used_at = now() where id = ${v.id}
        `;
      });
    } catch (e: unknown) {
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? String((e as { code: string }).code)
          : "";
      // Новый email заняли, пока ссылка ждала подтверждения.
      if (code === "23505") return fail("taken");
      throw e;
    }

    // Приветственное письмо только при первом подтверждении (не при смене адреса).
    if (!changedEmail) {
      try {
        const acc = (await sql`
          select email from careerlab_accounts where id = ${v.account_id} limit 1
        `) as { email: string }[];
        if (acc[0]?.email) {
          await sendWelcomeEmail({ to: acc[0].email, officeUrl: `${origin}/office` });
        }
      } catch (e) {
        console.error("[verify-email] welcome failed:", e);
      }
    }

    const res = NextResponse.redirect(
      `${origin}/office?verify=${changedEmail ? "email_changed" : "ok"}`,
    );

    // Если email сменили и пользователь залогинен - обновим сессию (в JWT лежит email).
    if (changedEmail) {
      const session = await getSessionFromCookies();
      if (session && session.id === v.account_id) {
        const newToken = await signAuthToken({
          id: session.id,
          email: changedEmail,
          displayName: session.displayName,
        });
        res.cookies.set(SESSION_COOKIE_NAME, newToken, sessionCookieOptions());
      }
    }
    return res;
  } catch (e) {
    console.error("[verify-email]", e);
    return fail("error");
  }
}
