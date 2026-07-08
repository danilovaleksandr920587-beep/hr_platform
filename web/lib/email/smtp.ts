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

export async function sendMail(params: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}) {
  const from = getRequiredEnv("SMTP_FROM");
  const t = getTransporter();
  await t.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
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

function appName() {
  return process.env.MAIL_APP_NAME?.trim() || "CareerLab";
}

function wrap(lines: string[]): string {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1e2114">
      ${lines.join("\n")}
    </div>
  `;
}

function primaryButton(href: string, label: string): string {
  return `<p><a href="${href}" style="display:inline-block;padding:10px 14px;background:#1e2114;color:#fff;text-decoration:none;border-radius:8px">${label}</a></p>`;
}

// Подтверждение email при регистрации (double opt-in).
export async function sendEmailVerification(params: { to: string; verifyUrl: string }) {
  await sendMail({
    to: params.to,
    subject: `${appName()}: подтвердите email`,
    text: [
      `Добро пожаловать в ${appName()}!`,
      "",
      "Подтвердите email, чтобы откликаться на вакансии и получать письма от работодателей:",
      params.verifyUrl,
      "",
      "Ссылка действует 48 часов.",
      "",
      "Если вы не регистрировались, просто проигнорируйте это письмо.",
    ].join("\n"),
    html: wrap([
      `<p>Добро пожаловать в <strong>${appName()}</strong>!</p>`,
      `<p>Подтвердите email, чтобы откликаться на вакансии и получать письма от работодателей.</p>`,
      primaryButton(params.verifyUrl, "Подтвердить email"),
      `<p>Если кнопка не работает: <a href="${params.verifyUrl}">${params.verifyUrl}</a></p>`,
      `<p style="color:#666">Ссылка действует 48 часов. Если вы не регистрировались, проигнорируйте письмо.</p>`,
    ]),
  });
}

// Подтверждение нового адреса при смене email (ссылка уходит на новый адрес).
export async function sendEmailChangeVerification(params: { to: string; verifyUrl: string }) {
  await sendMail({
    to: params.to,
    subject: `${appName()}: подтвердите новый email`,
    text: [
      `Вы указали этот адрес как новый email в ${appName()}.`,
      "",
      "Подтвердите смену адреса:",
      params.verifyUrl,
      "",
      "Ссылка действует 48 часов. Если это были не вы, проигнорируйте письмо - адрес не изменится.",
    ].join("\n"),
    html: wrap([
      `<p>Вы указали этот адрес как новый email в <strong>${appName()}</strong>.</p>`,
      primaryButton(params.verifyUrl, "Подтвердить новый email"),
      `<p>Если кнопка не работает: <a href="${params.verifyUrl}">${params.verifyUrl}</a></p>`,
      `<p style="color:#666">Ссылка действует 48 часов. Если это были не вы, проигнорируйте письмо - адрес не изменится.</p>`,
    ]),
  });
}

// Приветственное письмо после успешного подтверждения email.
export async function sendWelcomeEmail(params: { to: string; officeUrl: string }) {
  await sendMail({
    to: params.to,
    subject: `${appName()}: email подтверждён`,
    text: [
      `Email подтверждён - аккаунт в ${appName()} активен.`,
      "",
      "Теперь доступны отклики на вакансии и уведомления от работодателей.",
      "",
      `Личный кабинет: ${params.officeUrl}`,
    ].join("\n"),
    html: wrap([
      `<p>Email подтверждён - аккаунт в <strong>${appName()}</strong> активен.</p>`,
      `<p>Теперь доступны отклики на вакансии и уведомления от работодателей.</p>`,
      primaryButton(params.officeUrl, "Открыть личный кабинет"),
    ]),
  });
}

// Уведомление о смене пароля (после успешного reset-password).
export async function sendPasswordChangedEmail(params: { to: string; resetUrl: string }) {
  await sendMail({
    to: params.to,
    subject: `${appName()}: пароль изменён`,
    text: [
      `Пароль от аккаунта ${appName()} только что изменён.`,
      "",
      "Если это были вы - ничего делать не нужно.",
      "Если нет - немедленно восстановите доступ и смените пароль:",
      params.resetUrl,
    ].join("\n"),
    html: wrap([
      `<p>Пароль от аккаунта <strong>${appName()}</strong> только что изменён.</p>`,
      `<p>Если это были вы - ничего делать не нужно.</p>`,
      `<p>Если нет - немедленно восстановите доступ:</p>`,
      primaryButton(params.resetUrl, "Сбросить пароль"),
    ]),
  });
}

