import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/client-ip";
import { isSmtpConfigured, sendMail } from "@/lib/email/smtp";
import { SUPPORT_EMAIL } from "@/lib/support";

// Заявка на платное размещение с лендинга /for-companies.
// Без БД: письмо уходит в поддержку. Контакт клиента - в теле письма.

const LIMIT = { company: 200, contact: 200, pkg: 60, message: 2000 } as const;

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string,
  );
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  // Не больше 5 заявок с одного IP в час.
  if (!rateLimit(`placement:${ip}`, 5, 3600)) {
    return NextResponse.json(
      { error: `Слишком много заявок. Попробуйте позже или напишите на ${SUPPORT_EMAIL}.` },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  // Honeypot: скрытое поле, которое заполняют только боты. Тихо принимаем и выходим.
  if (clip(body.website, 100)) {
    return NextResponse.json({ ok: true });
  }

  const company = clip(body.company, LIMIT.company);
  const contact = clip(body.contact, LIMIT.contact);
  const pkg = clip(body.packageName, LIMIT.pkg) || "не выбран";
  const message = clip(body.message, LIMIT.message);

  if (!company || !contact) {
    return NextResponse.json(
      { error: "Заполните название компании и контакт." },
      { status: 400 },
    );
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: `Форма временно недоступна. Напишите на ${SUPPORT_EMAIL}.` },
      { status: 503 },
    );
  }

  const text = [
    "Новая заявка на размещение (CareerLab)",
    "",
    `Пакет: ${pkg}`,
    `Компания: ${company}`,
    `Контакт: ${contact}`,
    message ? `\nКомментарий:\n${message}` : "",
    "",
    `IP: ${ip}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e2114">
    <p><strong>Новая заявка на размещение</strong></p>
    <p><strong>Пакет:</strong> ${escapeHtml(pkg)}</p>
    <p><strong>Компания:</strong> ${escapeHtml(company)}</p>
    <p><strong>Контакт:</strong> ${escapeHtml(contact)}</p>
    ${message ? `<p><strong>Комментарий:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>` : ""}
    <p style="color:#666">IP: ${escapeHtml(ip)}</p>
  </div>`;

  try {
    await sendMail({
      to: SUPPORT_EMAIL,
      subject: `Заявка на размещение: ${pkg} - ${company}`,
      text,
      html,
    });
  } catch (e) {
    console.error("placement-request sendMail", e);
    return NextResponse.json(
      { error: `Не удалось отправить. Попробуйте ещё раз или напишите на ${SUPPORT_EMAIL}.` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
