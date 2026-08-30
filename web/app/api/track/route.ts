import "server-only";
import { NextResponse, after } from "next/server";
import { cookies, headers } from "next/headers";
import { getSessionFromCookies } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { deviceFromUserAgent, isBotUserAgent } from "@/lib/analytics/bots";
import { hostFromReferrer, parseUtm, resolveChannel } from "@/lib/analytics/channel";
import {
  ANON_COOKIE_NAME,
  SESSION_COOKIE_NAME as ANALYTICS_SESSION_COOKIE,
  isUuid,
} from "@/lib/analytics/identity";
import { MAX_BATCH, recordEvents, type ClientEvent } from "@/lib/analytics/events";
import { isTrackedPath } from "@/lib/analytics/page-type";

/**
 * Приём событий внутренней аналитики (docs/ANALYTICS.md).
 *
 * Всегда 204: трекинг не должен ни задерживать навигацию, ни давать клиенту
 * поводов для ретраев. Всё, что можно подделать (канал, устройство, аккаунт),
 * считается здесь, а не принимается с клиента.
 */

function noContent() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  const hdrs = await headers();
  const ua = hdrs.get("user-agent");
  if (isBotUserAgent(ua)) return noContent();

  const jar = await cookies();
  const anonId = jar.get(ANON_COOKIE_NAME)?.value;
  const sessionId = jar.get(ANALYTICS_SESSION_COOKIE)?.value;
  if (!isUuid(anonId)) return noContent(); // куку ставит middleware; нет её - нет и события

  if (!rateLimit(`track:${anonId}`, 60, 60)) return noContent();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return noContent();
  }

  const payload = body as {
    events?: unknown;
    referrer?: unknown;
    search?: unknown;
  };
  if (!Array.isArray(payload.events) || !payload.events.length) return noContent();

  const events = (payload.events as ClientEvent[])
    .filter((e) => e && typeof e.event === "string")
    .filter((e) => !e.path || isTrackedPath(String(e.path).split("?")[0]))
    .slice(0, MAX_BATCH);
  if (!events.length) return noContent();

  const referrerHost = hostFromReferrer(
    typeof payload.referrer === "string" ? payload.referrer : null,
  );
  const utm = parseUtm(typeof payload.search === "string" ? payload.search : null);
  const siteHost = hostFromReferrer(process.env.NEXT_PUBLIC_SITE_URL);
  const session = await getSessionFromCookies();

  const ctx = {
    anonId,
    sessionId: isUuid(sessionId) ? sessionId : null,
    accountId: session?.id ?? null,
    channel: resolveChannel(referrerHost, utm, siteHost),
    referrerHost,
    utm,
    device: deviceFromUserAgent(ua),
  };

  after(() => recordEvents(events, ctx));

  return noContent();
}
