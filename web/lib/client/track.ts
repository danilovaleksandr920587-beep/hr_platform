"use client";

import { isTrackedPath, pageContextFromPath } from "@/lib/analytics/page-type";
import { ymGoal } from "@/lib/client/metrika";

/**
 * Клиентская очередь событий внутренней аналитики.
 *
 * События не отправляются по одному: копятся и уходят батчем через
 * sendBeacon - так они переживают уход со страницы и не мешают навигации.
 * Идентификаторы посетителя тут не считаются: их выдаёт middleware в куках.
 *
 * Каждое событие, кроме page_view, дублируется одноимённой целью Метрики:
 * разрезы по сущностям смотрим у себя, источники трафика - там.
 */

export type TrackPayload = {
  pageType?: string;
  entityType?: string;
  entityId?: string;
  direction?: string | null;
  level?: string | null;
  city?: string | null;
  format?: string | null;
  props?: Record<string, unknown>;
};

type QueuedEvent = TrackPayload & { event: string; path: string };

const ENDPOINT = "/api/track";
const MAX_BATCH = 20;
const FLUSH_DELAY_MS = 2000;

const queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

/** Реферер и utm берём один раз при загрузке документа: дальше они не меняются. */
let entryReferrer = "";
let entrySearch = "";

function send(): void {
  if (typeof window === "undefined" || !queue.length) return;
  const events = queue.splice(0, queue.length);
  const body = JSON.stringify({ events, referrer: entryReferrer, search: entrySearch });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // аналитика не должна ломать страницу
  }
}

function bindListeners(): void {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  entryReferrer = document.referrer || "";
  entrySearch = window.location.search || "";

  const flushNow = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    send();
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
  window.addEventListener("pagehide", flushNow);
}

/** Ставит событие в очередь. Безопасно вызывать из любого клиентского кода. */
export function track(event: string, payload: TrackPayload = {}): void {
  if (typeof window === "undefined") return;
  bindListeners();

  const path = window.location.pathname;
  if (!isTrackedPath(path)) return;

  queue.push({ ...payload, event, path });
  if (event !== "page_view") ymGoal(event);

  if (queue.length >= MAX_BATCH) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    send();
    return;
  }

  if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      send();
    }, FLUSH_DELAY_MS);
  }
}

/** page_view с автоматически выведенным типом страницы и сущностью. */
export function trackPageView(path: string, extra: TrackPayload = {}): void {
  if (!isTrackedPath(path)) return;
  const ctx = pageContextFromPath(path);
  track("page_view", { ...ctx, ...extra });
}
