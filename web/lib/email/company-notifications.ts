import "server-only";
import { isSmtpConfigured, sendMail } from "./smtp";
import { platformAdminEmails } from "@/lib/auth/platform-admin";

/**
 * Письма B2B-контура. Все отправки fire-and-forget: не блокируют ответ API
 * и не роняют его при ошибке SMTP (ошибка уходит в console.error).
 */

function appName() {
  return process.env.MAIL_APP_NAME?.trim() || "CareerLab";
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://lab-career.ru";
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

export function notifyCompanyInvite(params: {
  to: string;
  companyName: string;
  inviteUrl: string;
}) {
  fireAndForget("invite", () =>
    sendMail({
      to: params.to,
      subject: `${appName()}: приглашение в компанию ${params.companyName}`,
      text: [
        `Вас пригласили в команду компании "${params.companyName}" на ${appName()}.`,
        "",
        `Принять приглашение: ${params.inviteUrl}`,
        "",
        "Ссылка действует 7 дней.",
      ].join("\n"),
      html: wrapHtml([
        `<p>Вас пригласили в команду компании <strong>${params.companyName}</strong> на ${appName()}.</p>`,
        button(params.inviteUrl, "Принять приглашение"),
        `<p>Если кнопка не работает: <a href="${params.inviteUrl}">${params.inviteUrl}</a></p>`,
        `<p style="color:#666">Ссылка действует 7 дней.</p>`,
      ]),
    }),
  );
}

export function notifyNewApplication(params: {
  to: string[];
  vacancyTitle: string;
  applicantName: string;
}) {
  if (!params.to.length) return;
  const url = `${siteUrl()}/company/applications`;
  fireAndForget("new application", () =>
    sendMail({
      to: params.to,
      subject: `${appName()}: новый отклик на "${params.vacancyTitle}"`,
      text: [
        `${params.applicantName} откликнулся(лась) на вакансию "${params.vacancyTitle}".`,
        "",
        `Посмотреть отклик: ${url}`,
      ].join("\n"),
      html: wrapHtml([
        `<p><strong>${params.applicantName}</strong> откликнулся(лась) на вакансию "${params.vacancyTitle}".</p>`,
        button(url, "Посмотреть отклик"),
      ]),
    }),
  );
}

export function notifyApplicationStatus(params: {
  to: string;
  vacancyTitle: string;
  companyName: string;
  status: "invited" | "rejected" | "viewed";
  note?: string | null;
}) {
  // Кандидату пишем только про значимые статусы
  if (params.status === "viewed") return;
  const url = `${siteUrl()}/office/applications`;
  const isInvite = params.status === "invited";
  const subject = isInvite
    ? `${appName()}: приглашение от ${params.companyName}`
    : `${appName()}: ответ по вакансии "${params.vacancyTitle}"`;
  const lead = isInvite
    ? `Компания "${params.companyName}" приглашает вас на следующий этап по вакансии "${params.vacancyTitle}".`
    : `Компания "${params.companyName}" рассмотрела ваш отклик на "${params.vacancyTitle}" и пока готова двигаться дальше с другими кандидатами.`;
  fireAndForget("application status", () =>
    sendMail({
      to: params.to,
      subject,
      text: [
        lead,
        params.note ? `\nСообщение от компании:\n${params.note}` : "",
        "",
        `Ваши отклики: ${url}`,
      ].join("\n"),
      html: wrapHtml([
        `<p>${lead}</p>`,
        params.note ? `<p style="white-space:pre-wrap;border-left:3px solid #ccc;padding-left:12px">${params.note}</p>` : "",
        button(url, "Мои отклики"),
      ]),
    }),
  );
}

export function notifyCompanyModeration(params: {
  to: string[];
  companyName: string;
  approved: boolean;
  reason?: string | null;
}) {
  if (!params.to.length) return;
  const url = `${siteUrl()}/company`;
  const lead = params.approved
    ? `Компания "${params.companyName}" прошла проверку. Теперь вакансии можно отправлять на публикацию.`
    : `Компания "${params.companyName}" не прошла проверку.${params.reason ? ` Причина: ${params.reason}` : ""} Исправьте данные в настройках и обратитесь в поддержку.`;
  fireAndForget("company moderation", () =>
    sendMail({
      to: params.to,
      subject: `${appName()}: ${params.approved ? "компания подтверждена" : "компания не прошла проверку"}`,
      text: `${lead}\n\nКабинет компании: ${url}`,
      html: wrapHtml([`<p>${lead}</p>`, button(url, "Кабинет компании")]),
    }),
  );
}

export function notifyVacancyModeration(params: {
  to: string[];
  vacancyTitle: string;
  vacancySlug: string;
  approved: boolean;
  reason?: string | null;
}) {
  if (!params.to.length) return;
  const url = params.approved
    ? `${siteUrl()}/vacancies/${params.vacancySlug}`
    : `${siteUrl()}/company/vacancies/${params.vacancySlug}`;
  const lead = params.approved
    ? `Вакансия "${params.vacancyTitle}" опубликована.`
    : `Вакансия "${params.vacancyTitle}" не прошла модерацию.${params.reason ? ` Причина: ${params.reason}` : ""} Отредактируйте её и отправьте снова.`;
  fireAndForget("vacancy moderation", () =>
    sendMail({
      to: params.to,
      subject: `${appName()}: ${params.approved ? "вакансия опубликована" : "вакансия не прошла модерацию"}`,
      text: `${lead}\n\n${url}`,
      html: wrapHtml([
        `<p>${lead}</p>`,
        button(url, params.approved ? "Открыть вакансию" : "Редактировать"),
      ]),
    }),
  );
}

export function notifyAdminsModerationQueue(params: {
  kind: "company" | "vacancy";
  name: string;
}) {
  const admins = platformAdminEmails();
  if (!admins.length) return;
  const url = `${siteUrl()}/admin/moderation`;
  const what =
    params.kind === "company"
      ? `Новая компания на проверку: "${params.name}"`
      : `Новая вакансия на модерацию: "${params.name}"`;
  fireAndForget("admin queue", () =>
    sendMail({
      to: admins,
      subject: `${appName()}: модерация - ${params.kind === "company" ? "компания" : "вакансия"}`,
      text: `${what}\n\n${url}`,
      html: wrapHtml([`<p>${what}</p>`, button(url, "Очередь модерации")]),
    }),
  );
}
