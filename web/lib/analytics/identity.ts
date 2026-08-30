/**
 * Идентификаторы посетителя для внутренней аналитики.
 *
 * Ставятся в middleware, а не из JS: так они переживают блокировщики скриптов
 * и не зависят от того, успел ли выполниться клиентский код. Личных данных в
 * них нет, IP мы не пишем вовсе - привязка к аккаунту появляется только после
 * логина, через account_id из session-cookie.
 */

/** Посетитель, 12 месяцев. */
export const ANON_COOKIE_NAME = "cl_aid";
/** Визит: продлевается на каждом запросе, разрыв 30 минут = новый визит. */
export const SESSION_COOKIE_NAME = "cl_sid";

export const ANON_MAX_AGE = 60 * 60 * 24 * 365;
export const SESSION_MAX_AGE = 60 * 30;

export function analyticsCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
