"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CompanyCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [inn, setInn] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (logoUrl.trim() && !/^https:\/\//i.test(logoUrl.trim())) {
      setError("Ссылка на логотип должна начинаться с https://");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, inn, website, logoUrl, description }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось создать компанию.");
        return;
      }
      router.push("/company");
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel" style={{ display: "grid", gap: 16 }}>
      <label className="company-field">
        Название компании *
        <input
          className="company-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={200}
          placeholder="ООО Пример или бренд"
        />
      </label>
      <label className="company-field">
        ИНН (ускоряет проверку)
        <input
          className="company-input"
          value={inn}
          onChange={(e) => setInn(e.target.value)}
          placeholder="10 или 12 цифр"
          inputMode="numeric"
        />
      </label>
      <label className="company-field">
        Сайт компании
        <input
          className="company-input"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.ru"
          type="url"
        />
      </label>
      <label className="company-field">
        Логотип (URL картинки)
        <input
          className="company-input"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.ru/logo.png"
          type="url"
        />
        <span className="company-hint">
          Прямая https-ссылка на картинку, лучше квадратную. Показывается на карточках вакансий.
        </span>
      </label>
      <label className="company-field">
        О компании
        <textarea
          className="company-textarea"
          style={{ minHeight: 100 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          placeholder="Чем занимаетесь, сколько людей в команде, почему к вам стоит идти джуну"
        />
      </label>
      {error && <p className="company-error">{error}</p>}
      <button className="btn-dark" type="submit" disabled={loading}>
        {loading ? "Создаём..." : "Создать компанию"}
      </button>
      <p className="company-hint">
        После создания компания попадает на проверку. Публикация вакансий откроется после
        подтверждения - обычно в течение 1 рабочего дня.
      </p>
    </form>
  );
}
