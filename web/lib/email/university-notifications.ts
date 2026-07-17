import "server-only";
import { isSmtpConfigured, sendMail } from "./smtp";

/**
 * Письма контура вузов. Fire-and-forget, как company-notifications:
 * не блокируют ответ API и не роняют его при ошибке SMTP.
 */

function appName() {
  return process.env.MAIL_APP_NAME?.trim() || "CareerLab";
}

function fireAndForget(subjectForLog: string, send: () => Promise<void>) {
  if (!isSmtpConfigured()) return;
  void send().catch((e) => {
    console.error(`email "${subjectForLog}" failed:`, e);
  });
}

function wrapHtml(lines: string[]): string {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1e2114">
      ${lines.join("\n")}
    </div>
  `;
}

function button(href: string, label: string): string {
  return `<p><a href="${href}" style="display:inline-block;padding:10px 14px;background:#1e2114;color:#fff;text-decoration:none;border-radius:8px">${label}</a></p>`;
}

export function notifyUniversityInvite(params: {
  to: string;
  universityName: string;
  inviteUrl: string;
}) {
  fireAndForget("university-invite", () =>
    sendMail({
      to: params.to,
      subject: `${appName()}: приглашение в кабинет вуза ${params.universityName}`,
      text: [
        `Вас пригласили в кабинет карьерного центра "${params.universityName}" на ${appName()}.`,
        "",
        `Принять приглашение: ${params.inviteUrl}`,
        "",
        "Ссылка действует 7 дней.",
      ].join("\n"),
      html: wrapHtml([
        `<p>Вас пригласили в кабинет карьерного центра <strong>${params.universityName}</strong> на ${appName()}.</p>`,
        button(params.inviteUrl, "Принять приглашение"),
        `<p>Если кнопка не работает: <a href="${params.inviteUrl}">${params.inviteUrl}</a></p>`,
        `<p style="color:#666">Ссылка действует 7 дней.</p>`,
      ]),
    }),
  );
}
