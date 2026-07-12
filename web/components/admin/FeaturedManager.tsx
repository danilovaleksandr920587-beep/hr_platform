"use client";

import Link from "next/link";
import { useState } from "react";

export type FeaturedVacancy = {
  slug: string;
  title: string;
  company: string;
  source: string | null;
  featured_until: string | null;
};

function formatUntil(until: string | null): string {
  if (!until) return "бессрочно";
  const d = new Date(until);
  const now = Date.now();
  const label = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (d.getTime() <= now) return `истекло (${label})`;
  const days = Math.ceil((d.getTime() - now) / 86_400_000);
  return `до ${label} · ${days} дн.`;
}

function isExpired(until: string | null): boolean {
  return until ? new Date(until).getTime() <= Date.now() : false;
}

export function FeaturedManager({ initial }: { initial: FeaturedVacancy[] }) {
  const [list, setList] = useState(initial);
  const [slug, setSlug] = useState("");
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callFeature(
    targetSlug: string,
    featured: boolean,
    daysValue?: number,
  ) {
    setBusy(targetSlug);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(targetSlug)}/feature`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ featured, days: daysValue }),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        vacancy?: FeaturedVacancy;
      };
      if (!res.ok || !data.vacancy) {
        setError(data.error ?? "Ошибка.");
        return false;
      }
      const v = data.vacancy;
      setList((cur) => {
        const without = cur.filter((x) => x.slug !== v.slug);
        return featured
          ? [...without, v].sort((a, b) =>
              (a.featured_until ?? "9999").localeCompare(b.featured_until ?? "9999"),
            )
          : without;
      });
      return true;
    } catch {
      setError("Ошибка сети.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function onFeatureSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().replace(/^.*\/vacancies\//, "").replace(/\/$/, "");
    if (!s) return;
    const d = Number(days);
    const ok = await callFeature(s, true, Number.isFinite(d) && d > 0 ? d : undefined);
    if (ok) setSlug("");
  }

  return (
    <section>
      <h2>Закрепления (платные размещения)</h2>
      {error && <p className="company-error">{error}</p>}

      <div className="panel" style={{ marginBottom: 16 }}>
        <form onSubmit={onFeatureSubmit} className="featured-add-form">
          <input
            className="company-input"
            type="text"
            placeholder="slug вакансии или ссылка"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            aria-label="Slug вакансии"
          />
          <input
            className="company-input featured-days-input"
            type="number"
            min={0}
            max={365}
            placeholder="дней"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            aria-label="Срок в днях (0 = бессрочно)"
          />
          <button className="btn-dark" type="submit" disabled={busy !== null}>
            Закрепить
          </button>
        </form>
        <p className="company-hint" style={{ margin: "8px 0 0" }}>
          Срок в днях; 0 или пусто - бессрочно (редакционное закрепление). Платное
          размещение - обычно 30 дней.
        </p>
      </div>

      {!list.length ? (
        <p className="company-hint">Нет активных закреплений.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((v) => {
            const expired = isExpired(v.featured_until);
            return (
              <div key={v.slug} className="panel featured-row">
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", fontWeight: 700 }}>
                    {v.title} · {v.company}
                  </p>
                  <p className="company-hint" style={{ margin: 0 }}>
                    <span style={{ color: expired ? "#c0392b" : undefined }}>
                      {formatUntil(v.featured_until)}
                    </span>
                    {v.source === "company" ? " · клиент" : " · парсер"}
                    {" · "}
                    <Link
                      className="text-link"
                      href={`/vacancies/${v.slug}`}
                      target="_blank"
                    >
                      открыть
                    </Link>
                  </p>
                </div>
                <button
                  className="btn-dark btn-dark--danger"
                  type="button"
                  disabled={busy === v.slug}
                  onClick={() => callFeature(v.slug, false)}
                >
                  Снять
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
