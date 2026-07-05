"use client";

import Link from "next/link";
import { useState } from "react";

const inputStyle = {
  width: "100%" as const,
  marginTop: 6,
  padding: "0.55rem 0.65rem",
  borderRadius: 10,
  border: "1px solid var(--border2, #ddd)",
  font: "inherit" as const,
};

export function ApplyForm({ slug, vacancyTitle }: { slug: string; vacancyTitle: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Прикрепите резюме (PDF или DOCX).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("resume", file);
      form.set("coverLetter", coverLetter);
      form.set("contact", contact);
      const res = await fetch(`/api/vacancies/${slug}/apply`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить отклик.");
        return;
      }
      setDone(true);
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Отклик отправлен.</strong> Компания получит уведомление, статус можно отслеживать
          в кабинете.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link className="btn-dark" href="/office/applications" style={{ textDecoration: "none" }}>
            Мои отклики
          </Link>
          <Link className="text-link" href="/vacancies" style={{ alignSelf: "center" }}>
            Смотреть ещё вакансии
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <label>
        Резюме * (PDF или DOCX, до 5 МБ)
        <input
          style={{ ...inputStyle, padding: "0.4rem" }}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      </label>
      <label>
        Сопроводительное письмо
        <textarea
          style={{ ...inputStyle, minHeight: 140 }}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          maxLength={3000}
          placeholder={`2-4 предложения: почему вам интересна позиция "${vacancyTitle}" и что вы уже умеете. Без шаблонных фраз.`}
        />
      </label>
      <label>
        Телефон или Telegram (необязательно)
        <input
          style={inputStyle}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={200}
          placeholder="@username или +7..."
        />
      </label>
      <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #666)" }}>
        Не знаете, что написать? Посмотрите{" "}
        <Link className="text-link" href="/knowledge-base/soprovoditelnoe-pismo-k-rezyume-primery-i-shablony-dlya-lyuboj-situatsii">
          примеры сопроводительных писем
        </Link>
        .
      </p>
      {error && <p style={{ color: "#c0392b", margin: 0 }}>{error}</p>}
      <button className="btn-dark" type="submit" disabled={busy}>
        {busy ? "Отправляем..." : "Откликнуться"}
      </button>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #666)" }}>
        Нажимая кнопку, вы соглашаетесь на передачу резюме и контактов компании-работодателю
        (<Link className="text-link" href="/consent">условия обработки данных</Link>).
      </p>
    </form>
  );
}
