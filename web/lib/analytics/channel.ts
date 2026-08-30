/**
 * Канал захода. Считается на сервере, клиенту доверяем только сырые referrer и
 * utm-метки (иначе канал можно подделать одним fetch-ом).
 */

export type Utm = Record<string, string>;

const SEARCH_HOSTS = [
  "yandex.",
  "google.",
  "bing.com",
  "duckduckgo.com",
  "mail.ru",
  "rambler.ru",
  "search.",
  "ecosia.org",
  "yahoo.",
];

const TELEGRAM_HOSTS = ["t.me", "telegram.org", "telegram.me", "web.telegram.org"];

const SOCIAL_HOSTS = ["vk.com", "vk.ru", "habr.com", "dzen.ru", "youtube.com", "linkedin.com", "pikabu.ru"];

export function hostFromReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * organic | telegram | social | referral | direct | paid | internal
 *
 * paid определяется только по utm_medium: платного трафика сейчас нет, но
 * когда появится, разметка уже будет учтена.
 */
export function resolveChannel(
  referrerHost: string | null,
  utm: Utm | null,
  siteHost: string | null,
): string {
  const medium = utm?.utm_medium?.toLowerCase() ?? "";
  const source = utm?.utm_source?.toLowerCase() ?? "";

  if (medium === "cpc" || medium === "ppc" || medium === "paid" || medium === "ads") return "paid";
  if (source.includes("telegram") || source === "tg") return "telegram";
  if (source && (medium === "email" || source.includes("email"))) return "email";

  if (!referrerHost) return source ? "referral" : "direct";
  if (siteHost && referrerHost === siteHost.replace(/^www\./, "")) return "internal";
  if (SEARCH_HOSTS.some((h) => referrerHost.includes(h))) return "organic";
  if (TELEGRAM_HOSTS.some((h) => referrerHost === h || referrerHost.endsWith(`.${h}`))) return "telegram";
  if (SOCIAL_HOSTS.some((h) => referrerHost === h || referrerHost.endsWith(`.${h}`))) return "social";
  return "referral";
}

/** utm-метки из query-строки страницы (не из запроса к /api/track). */
export function parseUtm(search: string | null | undefined): Utm | null {
  if (!search) return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return null;
  }
  const utm: Utm = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 120);
  }
  return Object.keys(utm).length ? utm : null;
}
