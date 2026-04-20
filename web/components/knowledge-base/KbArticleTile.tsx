"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ArticleRow } from "@/lib/types";

const STORAGE_KEY = "careerlab-kb-saved-slugs";

function readSaved(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeSaved(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

const kickerMap: Record<string, string> = {
  resume: "k-resume",
  interview: "k-interv",
  test: "k-test",
  salary: "k-salary",
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
    setSaved(readSaved().has(row.slug));
  }, [row.slug]);

  const toggleSave = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !saved;
      setSaved(next);
      const s = readSaved();
      if (next) s.add(row.slug);
      else s.delete(row.slug);
      writeSaved(s);
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
