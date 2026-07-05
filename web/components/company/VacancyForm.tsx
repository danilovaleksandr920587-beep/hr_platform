"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompanyVacancyStatus } from "@/lib/company/constants";

const inputStyle = {
  width: "100%" as const,
  marginTop: 6,
  padding: "0.55rem 0.65rem",
  borderRadius: 10,
  border: "1px solid var(--border2, #ddd)",
  font: "inherit" as const,
};

const SPHERE_OPTIONS = [
  ["it", "IT / разработка"],
  ["analytics", "Аналитика"],
  ["design", "Дизайн"],
  ["marketing", "Маркетинг"],
  ["product", "Продукт"],
  ["sales", "Продажи"],
  ["support", "Поддержка"],
  ["hr", "HR"],
  ["finance", "Финансы"],
  ["operations", "Операции"],
  ["security", "Безопасность"],
  ["devops", "DevOps"],
  ["legal", "Юриспруденция"],
] as const;

const EXP_OPTIONS = [
  ["none", "Без опыта"],
  ["lt1", "До 1 года"],
  ["1-3", "1-3 года"],
  ["gte3", "3+ года"],
] as const;

const FORMAT_OPTIONS = [
  ["remote", "Удалённо"],
  ["hybrid", "Гибрид"],
  ["office", "Офис"],
] as const;

const TYPE_OPTIONS = [
  ["internship", "Стажировка"],
  ["project", "Проект"],
  ["parttime", "Подработка"],
] as const;

export type VacancyFormValues = {
  title: string;
  description: string;
  sphere: string;
  exp: string;
  format: string;
  type: string;
  salaryMin: string;
  salaryMax: string;
  city: string;
  skills: string;
  applyMode: "internal" | "external";
  applyUrl: string;
};

const EMPTY: VacancyFormValues = {
  title: "",
  description: "",
  sphere: "it",
  exp: "none",
  format: "remote",
  type: "internship",
  salaryMin: "",
  salaryMax: "",
  city: "",
  skills: "",
  applyMode: "internal",
  applyUrl: "",
};

export function VacancyForm({
  companyId,
  slug,
  initial,
  status,
  companyVerified,
}: {
  companyId: string;
  slug?: string;
  initial?: Partial<VacancyFormValues>;
  status?: CompanyVacancyStatus;
  companyVerified: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(slug);
  const [values, setValues] = useState<VacancyFormValues>({ ...EMPTY, ...initial });
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function set<K extends keyof VacancyFormValues>(key: K, value: VacancyFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function payload() {
    return {
      title: values.title,
      description: values.description,
      sphere: values.sphere,
      exp: values.exp,
      format: values.format,
      type: values.type,
      salaryMin: values.salaryMin.trim() === "" ? null : Number(values.salaryMin),
      salaryMax: values.salaryMax.trim() === "" ? null : Number(values.salaryMax),
      city: values.city,
      skills: values.skills.split(",").map((s) => s.trim()).filter(Boolean),
      applyMode: values.applyMode,
      applyUrl: values.applyUrl,
    };
  }

  async function request(url: string, method: string, body: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string; vacancy?: { slug: string; status: string } };
    if (!res.ok) throw new Error(data.error ?? "Ошибка сервера.");
    return data;
  }

  async function save() {
    setLoading("save");
    setError(null);
    setNotice(null);
    try {
      if (isEdit) {
        await request(`/api/company/${companyId}/vacancies/${slug}`, "PATCH", payload());
        setNotice("Сохранено.");
        router.refresh();
      } else {
        const data = await request(`/api/company/${companyId}/vacancies`, "POST", payload());
        router.push(`/company/vacancies/${data.vacancy!.slug}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка.");
    } finally {
      setLoading(null);
    }
  }

  async function action(name: "submit" | "archive" | "unarchive") {
    if (!isEdit) return;
    setLoading(name);
    setError(null);
    setNotice(null);
    try {
      await request(`/api/company/${companyId}/vacancies/${slug}`, "PATCH", { action: name });
      setNotice(
        name === "submit"
          ? "Отправлено. Вакансия появится на сайте после модерации."
          : name === "archive"
            ? "Вакансия в архиве."
            : "Отправлено на модерацию.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка.");
    } finally {
      setLoading(null);
    }
  }

  const canSubmit = isEdit && (status === "draft" || status === "rejected");
  const canArchive = isEdit && status === "published";
  const canUnarchive = isEdit && status === "archived";

  return (
    <div className="panel" style={{ display: "grid", gap: 14 }}>
      <label>
        Название вакансии *
        <input
          style={inputStyle}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
          maxLength={200}
          placeholder="Стажёр-разработчик Python"
        />
      </label>
      <label>
        Описание * (задачи, требования, условия - минимум 100 символов)
        <textarea
          style={{ ...inputStyle, minHeight: 220 }}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          required
          maxLength={20000}
        />
      </label>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label>
          Сфера
          <select style={inputStyle} value={values.sphere} onChange={(e) => set("sphere", e.target.value)}>
            {SPHERE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Опыт
          <select style={inputStyle} value={values.exp} onChange={(e) => set("exp", e.target.value)}>
            {EXP_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Формат
          <select style={inputStyle} value={values.format} onChange={(e) => set("format", e.target.value)}>
            {FORMAT_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Тип занятости
          <select style={inputStyle} value={values.type} onChange={(e) => set("type", e.target.value)}>
            {TYPE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label>
          Зарплата от, ₽
          <input style={inputStyle} value={values.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} inputMode="numeric" />
        </label>
        <label>
          Зарплата до, ₽
          <input style={inputStyle} value={values.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} inputMode="numeric" />
        </label>
        <label>
          Город
          <input style={inputStyle} value={values.city} onChange={(e) => set("city", e.target.value)} placeholder="Москва" />
        </label>
      </div>
      <label>
        Навыки (через запятую)
        <input style={inputStyle} value={values.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Python, SQL, Git" />
      </label>
      <label>
        Приём откликов
        <select
          style={inputStyle}
          value={values.applyMode}
          onChange={(e) => set("applyMode", e.target.value as "internal" | "external")}
        >
          <option value="internal">На платформе (рекомендуем)</option>
          <option value="external">По внешней ссылке</option>
        </select>
      </label>
      {values.applyMode === "external" && (
        <label>
          Ссылка для отклика *
          <input
            style={inputStyle}
            value={values.applyUrl}
            onChange={(e) => set("applyUrl", e.target.value)}
            type="url"
            placeholder="https://hh.ru/vacancy/..."
          />
        </label>
      )}

      {error && <p style={{ color: "#c0392b", margin: 0 }}>{error}</p>}
      {notice && <p style={{ color: "#2e8b57", margin: 0 }}>{notice}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn-dark" onClick={save} disabled={loading !== null} type="button">
          {loading === "save" ? "Сохраняем..." : isEdit ? "Сохранить" : "Создать черновик"}
        </button>
        {canSubmit && (
          <button
            className="btn-dark"
            onClick={() => action("submit")}
            disabled={loading !== null || !companyVerified}
            type="button"
            title={companyVerified ? "" : "Доступно после проверки компании"}
          >
            {loading === "submit" ? "Отправляем..." : "Отправить на публикацию"}
          </button>
        )}
        {canArchive && (
          <button className="btn-dark" onClick={() => action("archive")} disabled={loading !== null} type="button">
            {loading === "archive" ? "..." : "Снять с публикации"}
          </button>
        )}
        {canUnarchive && (
          <button className="btn-dark" onClick={() => action("unarchive")} disabled={loading !== null} type="button">
            {loading === "unarchive" ? "..." : "Вернуть из архива"}
          </button>
        )}
      </div>
      {canSubmit && !companyVerified && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #666)" }}>
          Публикация откроется после проверки компании.
        </p>
      )}
    </div>
  );
}
