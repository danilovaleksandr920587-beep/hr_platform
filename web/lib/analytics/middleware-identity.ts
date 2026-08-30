import { NextResponse, type NextRequest } from "next/server";
import {
  ANON_COOKIE_NAME,
  ANON_MAX_AGE,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  analyticsCookieOptions,
  isUuid,
} from "./identity";

/**
 * Выдаёт посетителю cl_aid (12 мес) и cl_sid (30 мин, продлевается на каждом
 * запросе). Ставится в middleware, чтобы идентификаторы не зависели от JS.
 *
 * Ботам куки не выдаём: иначе таблица уников распухнет от краулеров, каждый из
 * которых на каждом запросе выглядит новым посетителем.
 */
export function attachAnalyticsIdentity(request: NextRequest, response: NextResponse): NextResponse {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || /(bot|crawler|spider|slurp|ahrefs|semrush|petalbot|curl\/|wget|python-requests)/i.test(ua)) {
    return response;
  }

  const anon = request.cookies.get(ANON_COOKIE_NAME)?.value;
  if (!isUuid(anon)) {
    response.cookies.set(ANON_COOKIE_NAME, crypto.randomUUID(), analyticsCookieOptions(ANON_MAX_AGE));
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  // Продлеваем на каждом запросе: 30 минут без активности = следующий визит.
  const value = isUuid(session) ? session : crypto.randomUUID();
  response.cookies.set(SESSION_COOKIE_NAME, value, analyticsCookieOptions(SESSION_MAX_AGE));

  return response;
}
