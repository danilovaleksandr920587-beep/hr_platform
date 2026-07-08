import "server-only";
import { getSql } from "@/lib/db/postgres";
import { generateEmailVerificationToken } from "@/lib/auth/email-verification";
import {
  isSmtpConfigured,
  sendEmailVerification,
  sendEmailChangeVerification,
} from "@/lib/email/smtp";

/**
 * Создаёт токен подтверждения email и отправляет письмо.
 * - newEmail не задан -> подтверждение текущего email аккаунта, письмо на `sendTo`.
 * - newEmail задан     -> смена адреса, письмо-подтверждение уходит на новый адрес.
 *
 * Кидает, если SMTP не настроен или отправка не удалась - вызывающий решает,
 * ронять ли операцию (при регистрации не роняем, при resend/смене - показываем ошибку).
 */
export async function issueEmailVerification(params: {
  accountId: string;
  sendTo: string;
  origin: string;
  newEmail?: string | null;
  ip?: string;
}) {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured");
  }
  const sql = getSql();
  const generated = generateEmailVerificationToken();
  await sql`
    insert into careerlab_email_verifications (account_id, new_email, token_hash, expires_at, requested_ip)
    values (${params.accountId}, ${params.newEmail ?? null}, ${generated.tokenHash}, ${generated.expiresAtIso}, ${params.ip ?? ""})
  `;
  const verifyUrl = `${params.origin}/api/auth/verify-email?token=${generated.token}`;
  if (params.newEmail) {
    await sendEmailChangeVerification({ to: params.sendTo, verifyUrl });
  } else {
    await sendEmailVerification({ to: params.sendTo, verifyUrl });
  }
}

/** Подтверждён ли email аккаунта (для баннера и гейта откликов). */
export async function isEmailVerified(accountId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    select email_verified from careerlab_accounts where id = ${accountId} limit 1
  `) as { email_verified: boolean }[];
  return Boolean(rows[0]?.email_verified);
}
