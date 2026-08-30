import "server-only";
import { getSql } from "@/lib/db/postgres";
import { isDirection } from "@/lib/taxonomy/directions";

/** Событие в том виде, в каком его присылает клиент. */
export type ClientEvent = {
  event: string;
  path?: string | null;
  pageType?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  direction?: string | null;
  level?: string | null;
  city?: string | null;
  format?: string | null;
  props?: Record<string, unknown> | null;
};

/** Всё, что клиенту не доверяем и добавляем на сервере. */
export type EventContext = {
  anonId: string | null;
  sessionId: string | null;
  accountId: string | null;
  channel: string | null;
  referrerHost: string | null;
  utm: Record<string, string> | null;
  device: string | null;
};

/** Событий в одном батче больше не принимаем. */
export const MAX_BATCH = 20;

/** Разрешённые имена событий: словарь из docs/ANALYTICS.md, п. 6. */
export const KNOWN_EVENTS = new Set([
  "page_view",
  "vacancy_view",
  "vacancy_apply_click",
  "vacancy_save",
  "search_performed",
  "filter_applied",
  "article_view",
  "article_read",
  "article_cta_click",
  "tool_start",
  "tool_finish",
  "register_start",
  "register_success",
  "profile_completed",
  "application_submit",
  "company_lead_click",
  "tg_click",
]);

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean ? clean.slice(0, max) : null;
}

/**
 * Пишет батч событий. Ошибки проглатываются: аналитика не повод отдавать
 * пользователю ошибку. Вызывать из after().
 */
export async function recordEvents(events: ClientEvent[], ctx: EventContext): Promise<void> {
  const clean = events.filter((e) => KNOWN_EVENTS.has(e.event)).slice(0, MAX_BATCH);
  if (!clean.length) return;

  try {
    const sql = getSql();
    const rows = clean.map((e) => {
      const direction = text(e.direction, 32);
      return {
        event: e.event,
        anon_id: ctx.anonId,
        session_id: ctx.sessionId,
        account_id: ctx.accountId,
        page_type: text(e.pageType, 32),
        path: text(e.path, 300),
        entity_type: text(e.entityType, 32),
        entity_id: text(e.entityId, 200),
        direction: isDirection(direction) ? direction : null,
        level: text(e.level, 16),
        city: text(e.city, 80),
        format: text(e.format, 16),
        channel: ctx.channel,
        referrer_host: ctx.referrerHost,
        utm: ctx.utm ? sql.json(ctx.utm as never) : null,
        device: ctx.device,
        props: e.props && typeof e.props === "object" ? sql.json(e.props as never) : null,
      };
    });

    await sql`
      insert into public.analytics_events ${sql(
        rows,
        "event",
        "anon_id",
        "session_id",
        "account_id",
        "page_type",
        "path",
        "entity_type",
        "entity_id",
        "direction",
        "level",
        "city",
        "format",
        "channel",
        "referrer_host",
        "utm",
        "device",
        "props",
      )}
    `;
  } catch (err) {
    console.error("recordEvents", err instanceof Error ? err.message : String(err));
  }
}
