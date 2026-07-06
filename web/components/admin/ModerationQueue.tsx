"use client";

import Link from "next/link";
import { useState } from "react";

export type PendingCompany = {
  id: string;
  name: string;
  inn: string | null;
  website: string | null;
  description: string;
  created_at: string;
};

export type PendingVacancy = {
  slug: string;
  title: string;
  company: string;
  description: string | null;
  apply_mode: string;
  apply_url: string | null;
  city: string | null;
};

export function ModerationQueue({
  initialCompanies,
  initialVacancies,
}: {
  initialCompanies: PendingCompany[];
  initialVacancies: PendingVacancy[];
}) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [vacancies, setVacancies] = useState(initialVacancies);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decideCompany(id: string, approve: boolean) {
    const reason = approve
      ? undefined
      : window.prompt("Причина отклонения (увидит владелец компании):") ?? undefined;
    if (!approve && reason === undefined) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/companies/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve, reason }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка.");
        return;
      }
      setCompanies((list) => list.filter((c) => c.id !== id));
    } catch {
      setError("Ошибка сети.");
    } finally {
      setBusy(null);
    }
  }

  async function decideVacancy(slug: string, approve: boolean) {
    const reason = approve
      ? undefined
      : window.prompt("Причина отклонения (увидит компания):") ?? undefined;
    if (!approve && reason === undefined) return;
    setBusy(slug);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vacancies/${slug}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve, reason }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка.");
        return;
      }
      setVacancies((list) => list.filter((v) => v.slug !== slug));
    } catch {
      setError("Ошибка сети.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {error && <p className="company-error">{error}</p>}

      <section>
        <h2>Компании на проверку ({companies.length})</h2>
        {!companies.length ? (
          <p className="company-hint">Очередь пуста.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {companies.map((c) => (
              <div key={c.id} className="panel">
                <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{c.name}</p>
                <p className="company-hint" style={{ marginBottom: 8 }}>
                  ИНН: {c.inn || "не указан"}
                  {c.website ? (
                    <>
                      {" · "}
                      <a className="text-link" href={c.website} target="_blank" rel="noopener noreferrer">
                        {c.website}
                      </a>
                    </>
                  ) : (
                    " · сайт не указан"
                  )}
                </p>
                {c.description && (
                  <p style={{ margin: "0 0 10px", fontSize: 14, whiteSpace: "pre-wrap" }}>
                    {c.description.slice(0, 500)}
                  </p>
                )}
                <div className="company-form-actions">
                  <button
                    className="btn-dark btn-dark--success"
                    type="button"
                    disabled={busy === c.id}
                    onClick={() => decideCompany(c.id, true)}
                  >
                    Подтвердить
                  </button>
                  <button
                    className="btn-dark btn-dark--danger"
                    type="button"
                    disabled={busy === c.id}
                    onClick={() => decideCompany(c.id, false)}
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Вакансии на модерацию ({vacancies.length})</h2>
        {!vacancies.length ? (
          <p className="company-hint">Очередь пуста.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {vacancies.map((v) => (
              <div key={v.slug} className="panel">
                <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
                  {v.title} · {v.company}
                </p>
                <p className="company-hint" style={{ marginBottom: 8 }}>
                  {v.city || "город не указан"} · отклик:{" "}
                  {v.apply_mode === "internal" ? "на платформе" : `внешний (${v.apply_url ?? "?"})`}
                </p>
                {v.description && (
                  <p style={{ margin: "0 0 10px", fontSize: 14, whiteSpace: "pre-wrap" }}>
                    {v.description.slice(0, 700)}
                    {v.description.length > 700 ? "..." : ""}
                  </p>
                )}
                <div className="company-form-actions">
                  <button
                    className="btn-dark btn-dark--success"
                    type="button"
                    disabled={busy === v.slug}
                    onClick={() => decideVacancy(v.slug, true)}
                  >
                    Опубликовать
                  </button>
                  <button
                    className="btn-dark btn-dark--danger"
                    type="button"
                    disabled={busy === v.slug}
                    onClick={() => decideVacancy(v.slug, false)}
                  >
                    Отклонить
                  </button>
                  <Link className="text-link" href={`/vacancies/${v.slug}`} target="_blank" style={{ fontSize: 13 }}>
                    Предпросмотр (после публикации)
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
