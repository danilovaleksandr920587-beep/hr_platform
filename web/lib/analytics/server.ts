import "server-only";
import { cookies, headers } from "next/headers";
import { deviceFromUserAgent, isBotUserAgent } from "./bots";
import { ANON_COOKIE_NAME, SESSION_COOKIE_NAME, isUuid } from "./identity";
import { recordEvents, type ClientEvent } from "./events";

/**
 * Событие, которое случилось на сервере и до клиента не доходит: например
 * регистрация через Яндекс OAuth - её обрабатывает redirect-роут, JS на
 * странице при этом не выполняется.
 *
 * Канал тут не считаем: у серверного редиректа нет ни referrer страницы, ни
 * utm-меток - они уже были записаны в page_view этого же визита.
 */
export async function recordServerEvent(event: ClientEvent): Promise<void> {
  try {
    const hdrs = await headers();
    const ua = hdrs.get("user-agent");
    if (isBotUserAgent(ua)) return;

    const jar = await cookies();
    const anonId = jar.get(ANON_COOKIE_NAME)?.value;
    const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;

    await recordEvents([event], {
      anonId: isUuid(anonId) ? anonId : null,
      sessionId: isUuid(sessionId) ? sessionId : null,
      accountId: null,
      channel: null,
      referrerHost: null,
      utm: null,
      device: deviceFromUserAgent(ua),
    });
  } catch (err) {
    console.error("recordServerEvent", err instanceof Error ? err.message : String(err));
  }
}
