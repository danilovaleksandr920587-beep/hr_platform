"use client";

import { useEffect } from "react";
import { track } from "@/lib/client/track";

const READ_DEPTH = 0.75;
const READ_SECONDS = 30;

type Props = {
  slug: string;
  catSlug: string;
  level?: string | null;
};

/**
 * Просмотр и дочитывание статьи.
 *
 * «Дочитал» = 75 % прокрутки И 30 секунд на странице (определение из
 * docs/ANALYTICS.md). Одного скролла мало: до низа коротких статей долистывают
 * за пару секунд, ничего не прочитав.
 */
export function ArticleReadTracker({ slug, catSlug, level }: Props) {
  useEffect(() => {
    const key = `av:${slug}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        track("article_view", {
          entityType: "article",
          entityId: slug,
          level: level ?? null,
          props: { cluster: catSlug },
        });
      }
    } catch {
      track("article_view", { entityType: "article", entityId: slug, props: { cluster: catSlug } });
    }

    const startedAt = Date.now();
    let deepEnough = false;
    let sent = false;

    const maybeSend = () => {
      if (sent || !deepEnough) return;
      if (Date.now() - startedAt < READ_SECONDS * 1000) return;
      sent = true;
      track("article_read", {
        entityType: "article",
        entityId: slug,
        level: level ?? null,
        props: { cluster: catSlug },
      });
      window.removeEventListener("scroll", onScroll);
    };

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        deepEnough = true;
      } else if (window.scrollY / scrollable >= READ_DEPTH) {
        deepEnough = true;
      }
      maybeSend();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    const timer = setTimeout(maybeSend, READ_SECONDS * 1000 + 100);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [slug, catSlug, level]);

  return null;
}
