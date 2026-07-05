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

export function CompanyCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [inn, setInn] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, inn, website, description }),
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
    <form onSubmit={submit} className="panel" style={{ display: "grid", gap: 14 }}>
      <label>
        Название компании *
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={200}
          placeholder="ООО Пример или бренд"
        />
      </label>
      <label>
        ИНН (ускоряет проверку)
        <input
          style={inputStyle}
          value={inn}
          onChange={(e) => setInn(e.target.value)}
          placeholder="10 или 12 цифр"
          inputMode="numeric"
        />
      </label>
      <label>
        Сайт компании
        <input
          style={inputStyle}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.ru"
          type="url"
        />
      </label>
      <label>
        О компании
        <textarea
          style={{ ...inputStyle, minHeight: 100 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          placeholder="Чем занимаетесь, сколько людей в команде, почему к вам стоит идти джуну"
        />
      </label>
      {error && <p style={{ color: "#c0392b", margin: 0 }}>{error}</p>}
      <button className="btn-dark" type="submit" disabled={loading}>
        {loading ? "Создаём..." : "Создать компанию"}
      </button>
      <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #666)" }}>
        После создания компания попадает на проверку. Публикация вакансий откроется после
        подтверждения - обычно в течение 1 рабочего дня.
      </p>
    </form>
  );
}
