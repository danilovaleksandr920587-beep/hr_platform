"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Contacts = Partial<
  Record<"email" | "phone" | "telegram" | "website" | "address", string>
>;

/** Редактирование публичной витрины /universities/[slug] силами ЦКС.
 *  Витрина публикуется (и попадает в sitemap), когда заполнено описание. */
export function VuzShowcaseForm({
  universityId,
  slug,
  initialDescription,
  initialContacts,
  initialLogoUrl,
  initialPublicStats,
}: {
  universityId: string;
  slug: string;
  initialDescription: string;
  initialContacts: Contacts;
  initialLogoUrl: string;
  initialPublicStats: boolean;
}) {
  const router = useRouter();
  const [description, setDescription] = useState(initialDescription);
  const [contacts, setContacts] = useState<Contacts>(initialContacts);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [publicStats, setPublicStats] = useState(initialPublicStats);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function setContact(key: keyof Contacts, value: string) {
    setContacts((c) => ({ ...c, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (logoUrl.trim() && !/^https:\/\//i.test(logoUrl.trim())) {
      setError("Ссылка на логотип должна начинаться с https://");
      setNotice(null);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/university/${universityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          contacts,
          logoUrl: logoUrl.trim() || null,
          publicStats,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить.");
        return;
      }
      setNotice(
        description.trim()
          ? `Сохранено. Витрина: /universities/${slug} (обновится в течение ~10 минут).`
          : "Сохранено. Витрина откроется, когда будет заполнено описание.",
      );
      router.refresh();
    } catch {
      setError("Ошибка сети.");
    } finally {
      setBusy(false);
    }
  }

  const contactFields: { key: keyof Contacts; label: string; placeholder: string }[] = [
    { key: "email", label: "Email карьерного центра", placeholder: "career@university.ru" },
    { key: "phone", label: "Телефон", placeholder: "+7 ..." },
    { key: "telegram", label: "Telegram", placeholder: "@career_center" },
    { key: "website", label: "Сайт ЦКС", placeholder: "https://university.ru/career" },
    { key: "address", label: "Адрес", placeholder: "Москва, ..." },
  ];

  return (
    <form className="panel" onSubmit={submit} style={{ display: "grid", gap: 16 }}>
      <label className="company-field">
        О карьерном центре (публичный текст витрины)
        <textarea
          className="company-textarea"
          style={{ minHeight: 120 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
          placeholder="Чем занимается карьерный центр, какие сервисы доступны студентам..."
        />
      </label>
      <label className="company-field">
        Логотип (URL картинки)
        <input
          className="company-input"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          type="url"
          placeholder="https://example.ru/logo.png"
        />
        <span className="company-hint">
          Прямая https-ссылка на картинку, лучше квадратную.
        </span>
      </label>
      <div className="company-field-row">
        {contactFields.map((f) => (
          <label className="company-field" key={f.key}>
            {f.label}
            <input
              className="company-input"
              value={contacts[f.key] ?? ""}
              onChange={(e) => setContact(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          </label>
        ))}
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}>
        <input
          type="checkbox"
          checked={publicStats}
          onChange={(e) => setPublicStats(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span>
          Показывать на витрине число студентов вуза на платформе (только агрегат,
          появится после накопления данных)
        </span>
      </label>
      {error && <p className="company-error">{error}</p>}
      {notice && <p className="company-notice">{notice}</p>}
      <button className="btn-dark" type="submit" disabled={busy}>
        {busy ? "Сохраняем..." : "Сохранить"}
      </button>
    </form>
  );
}
