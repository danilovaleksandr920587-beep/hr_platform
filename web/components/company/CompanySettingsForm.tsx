"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputStyle = {
  width: "100%" as const,
  marginTop: 6,
  padding: "0.55rem 0.65rem",
  borderRadius: 10,
  border: "1px solid var(--border2, #ddd)",
  font: "inherit" as const,
};

export function CompanySettingsForm({
  companyId,
  isOwner,
  initial,
}: {
  companyId: string;
  isOwner: boolean;
  initial: { name: string; inn: string; website: string; description: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/company/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить.");
        return;
      }
      setNotice("Сохранено.");
      router.refresh();
    } catch {
      setError("Ошибка сети.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="panel">
        <p style={{ margin: 0 }}>Настройки компании может менять только владелец.</p>
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <label>
        Название компании
        <input
          style={inputStyle}
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
          minLength={2}
          maxLength={200}
        />
      </label>
      <label>
        ИНН
        <input
          style={inputStyle}
          value={values.inn}
          onChange={(e) => setValues((v) => ({ ...v, inn: e.target.value }))}
          inputMode="numeric"
        />
      </label>
      <label>
        Сайт
        <input
          style={inputStyle}
          value={values.website}
          onChange={(e) => setValues((v) => ({ ...v, website: e.target.value }))}
          type="url"
        />
      </label>
      <label>
        О компании (показывается на страницах вакансий)
        <textarea
          style={{ ...inputStyle, minHeight: 100 }}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          maxLength={5000}
        />
      </label>
      {error && <p style={{ color: "#c0392b", margin: 0 }}>{error}</p>}
      {notice && <p style={{ color: "#2e8b57", margin: 0 }}>{notice}</p>}
      <button className="btn-dark" type="submit" disabled={busy}>
        {busy ? "Сохраняем..." : "Сохранить"}
      </button>
    </form>
  );
}
