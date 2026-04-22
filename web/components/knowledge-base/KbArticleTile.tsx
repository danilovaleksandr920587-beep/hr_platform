"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ArticleRow } from "@/lib/types";
import {
  SAVED_ITEMS_EVENT,
  isArticleSaved,
  setArticleSaved,
} from "@/lib/client/saved-items";

const kickerMap: Record<string, string> = {
  resume: "k-resume",
  interview: "k-interv",
  test: "k-test",
  salary: "k-salary",
  apply: "k-apply",
  career: "k-career",
};

export function KbArticleTile({
  row,
  className,
  showDeco,
}: {
  row: ArticleRow;
  className: string;
  showDeco?: boolean;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(isArticleSaved(row.slug));
    sync();
    window.addEventListener(SAVED_ITEMS_EVENT, sync);
    return () => window.removeEventListener(SAVED_ITEMS_EVENT, sync);
  }, [row.slug]);

  const toggleSave = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !saved;
      setSaved(next);
      setArticleSaved(row.slug, next);
    },
    [row.slug, saved],
  );

  const kc = kickerMap[row.cat_slug] ?? "k-resume";

  return (
    <div className={className}>
      <Link
        href={`/knowledge-base/${row.slug}`}
        className="art-hit"
        aria-label={row.title}
      />
      <div className="art-inner">
        <div className={`kicker ${kc}`}>
          <span className="kip" />
          {row.category}
        </div>
        <div className="art-title">{row.title}</div>
        <p className="art-desc">{row.excerpt}</p>
        <div className="art-foot">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="art-foot-time">
              {row.read_time} мин
              {row.level ? ` · ${row.level}` : ""}
            </span>
            {row.is_new ? <span className="badge badge-new">Новое</span> : null}
          </div>
          <button
            type="button"
            className={`art-save${saved ? " on" : ""}`}
            onClick={toggleSave}
            aria-pressed={saved}
            aria-label={saved ? "Убрать из сохранённых" : "Сохранить материал"}
          >
            {saved ? "♥" : "♡"}
          </button>
        </div>
      </div>
      {showDeco ? (
        <div className="art-deco-num" aria-hidden="true">
          {row.read_time}
        </div>
      ) : null}
    </div>
  );
}
