"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CompanySettingsForm({
  companyId,
  isOwner,
  initial,
}: {
  companyId: string;
  isOwner: boolean;
  initial: { name: string; inn: string; website: string; logoUrl: string; description: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (values.logoUrl.trim() && !/^https:\/\//i.test(values.logoUrl.trim())) {
      setError("Ссылка на логотип должна начинаться с https://");
      setNotice(null);
      return;
    }
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
        <p style={{ margin: 0 }}>Настройки компании могут менять владелец и администраторы.</p>
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={submit} style={{ display: "grid", gap: 16 }}>
      <label className="company-field">
        Название компании
        <input
          className="company-input"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
          minLength={2}
          maxLength={200}
        />
      </label>
      <label className="company-field">
        ИНН
        <input
          className="company-input"
          value={values.inn}
          onChange={(e) => setValues((v) => ({ ...v, inn: e.target.value }))}
          inputMode="numeric"
        />
      </label>
      <label className="company-field">
        Сайт
        <input
          className="company-input"
          value={values.website}
          onChange={(e) => setValues((v) => ({ ...v, website: e.target.value }))}
          type="url"
        />
      </label>
      <label className="company-field">
        Логотип (URL картинки)
        <input
          className="company-input"
          value={values.logoUrl}
          onChange={(e) => setValues((v) => ({ ...v, logoUrl: e.target.value }))}
          type="url"
          placeholder="https://example.ru/logo.png"
        />
        <span className="company-hint">
          Прямая https-ссылка на картинку, лучше квадратную. Показывается на карточках вакансий.
        </span>
      </label>
      <label className="company-field">
        О компании (показывается на страницах вакансий)
        <textarea
          className="company-textarea"
          style={{ minHeight: 100 }}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          maxLength={5000}
        />
      </label>
      {error && <p className="company-error">{error}</p>}
      {notice && <p className="company-notice">{notice}</p>}
      <button className="btn-dark" type="submit" disabled={busy}>
        {busy ? "Сохраняем..." : "Сохранить"}
      </button>
    </form>
  );
}
