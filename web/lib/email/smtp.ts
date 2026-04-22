import "server-only";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getTransporter() {
  if (transporter) return transporter;

  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const secure = String(process.env.SMTP_SECURE ?? "false") === "true";

  transporter = nodemailer.createTransport({
    host,
    port: Number.isNaN(port) ? 587 : port,
    secure,
    auth: { user, pass },
  });
  return transporter;
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      process.env.SMTP_FROM?.trim(),
  );
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}) {
  const from = getRequiredEnv("SMTP_FROM");
  const appName = process.env.MAIL_APP_NAME?.trim() || "CareerLab";
  const t = getTransporter();

  const subject = `${appName}: восстановление пароля`;
  const text = [
    `Вы запросили восстановление пароля в ${appName}.`,
    "",
    `Откройте ссылку, чтобы установить новый пароль:`,
    params.resetUrl,
    "",
    "Ссылка действует 30 минут и может быть использована только один раз.",
    "",
    "Если вы не запрашивали восстановление, просто проигнорируйте это письмо.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1e2114">
      <p>Вы запросили восстановление пароля в <strong>${appName}</strong>.</p>
      <p>
        <a href="${params.resetUrl}" style="display:inline-block;padding:10px 14px;background:#1e2114;color:#fff;text-decoration:none;border-radius:8px">
          Установить новый пароль
        </a>
      </p>
      <p>Если кнопка не работает, используйте ссылку:</p>
      <p><a href="${params.resetUrl}">${params.resetUrl}</a></p>
      <p style="color:#666">Ссылка действует 30 минут и может быть использована только один раз.</p>
      <p style="color:#666">Если вы не запрашивали восстановление, просто проигнорируйте это письмо.</p>
    </div>
  `;

  await t.sendMail({
    from,
    to: params.to,
    subject,
    text,
    html,
  });
}

