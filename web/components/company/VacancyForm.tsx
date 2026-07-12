"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompanyVacancyStatus } from "@/lib/company/constants";

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
  tasks: string;
  requirements: string;
  conditions: string;
  aboutTeam: string;
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
  tasks: "",
  requirements: "",
  conditions: "",
  aboutTeam: "",
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
  companyTrusted = false,
}: {
  companyId: string;
  slug?: string;
  initial?: Partial<VacancyFormValues>;
  status?: CompanyVacancyStatus;
  companyVerified: boolean;
  companyTrusted?: boolean;
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
      tasks: values.tasks,
      requirements: values.requirements,
      conditions: values.conditions,
      aboutTeam: values.aboutTeam,
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
    if (!values.tasks.trim()) {
      setError("Заполните задачи - без них вакансия не пройдёт модерацию.");
      setNotice(null);
      return;
    }
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
    <div className="panel" style={{ display: "grid", gap: 16 }}>
      <label className="company-field">
        Название вакансии *
        <input
          className="company-input"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
          maxLength={200}
          placeholder="Стажёр-разработчик Python"
        />
      </label>
      <label className="company-field">
        Задачи * (что будет делать человек)
        <textarea
          className="company-textarea"
          style={{ minHeight: 110 }}
          value={values.tasks}
          onChange={(e) => set("tasks", e.target.value)}
          required
          maxLength={10000}
          placeholder={"Разбирать тикеты из саппорта\nПисать автотесты на новые фичи\nУчаствовать в код-ревью команды"}
        />
      </label>
      <label className="company-field">
        Требования * (что нужно знать и уметь)
        <textarea
          className="company-textarea"
          style={{ minHeight: 110 }}
          value={values.requirements}
          onChange={(e) => set("requirements", e.target.value)}
          maxLength={10000}
          placeholder={"База SQL и Python на уровне pet-проектов\nGit: ветки, pull request\nАнглийский для чтения документации"}
        />
      </label>
      <label className="company-field">
        Условия * (график, менторство, оплата)
        <textarea
          className="company-textarea"
          style={{ minHeight: 110 }}
          value={values.conditions}
          onChange={(e) => set("conditions", e.target.value)}
          maxLength={10000}
          placeholder={"Оплачиваемая стажировка 20-40 часов в неделю\nМентор и план на первые 3 месяца\nОформление по ТК или ГПХ"}
        />
      </label>
      <label className="company-field">
        О команде (необязательно)
        <textarea
          className="company-textarea"
          style={{ minHeight: 80 }}
          value={values.aboutTeam}
          onChange={(e) => set("aboutTeam", e.target.value)}
          maxLength={10000}
          placeholder="Сколько людей в команде, кто будет ментором, как устроен онбординг"
        />
      </label>
      <div className="company-field-row">
        <label className="company-field">
          Сфера
          <select className="company-select-field" value={values.sphere} onChange={(e) => set("sphere", e.target.value)}>
            {SPHERE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="company-field">
          Опыт
          <select className="company-select-field" value={values.exp} onChange={(e) => set("exp", e.target.value)}>
            {EXP_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="company-field">
          Формат
          <select className="company-select-field" value={values.format} onChange={(e) => set("format", e.target.value)}>
            {FORMAT_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="company-field">
          Тип занятости
          <select className="company-select-field" value={values.type} onChange={(e) => set("type", e.target.value)}>
            {TYPE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="company-field-row">
        <label className="company-field">
          Зарплата от, ₽
          <input className="company-input" value={values.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} inputMode="numeric" />
        </label>
        <label className="company-field">
          Зарплата до, ₽
          <input className="company-input" value={values.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} inputMode="numeric" />
        </label>
        <label className="company-field">
          Город
          <input className="company-input" value={values.city} onChange={(e) => set("city", e.target.value)} placeholder="Москва" />
        </label>
      </div>
      <p className="company-hint" style={{ margin: 0 }}>
        Вакансии с указанной вилкой получают заметно больше откликов.
      </p>
      <label className="company-field">
        Навыки (через запятую)
        <input className="company-input" value={values.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Python, SQL, Git" />
      </label>
      <label className="company-field">
        Приём откликов
        <select
          className="company-select-field"
          value={values.applyMode}
          onChange={(e) => set("applyMode", e.target.value as "internal" | "external")}
        >
          <option value="internal">На платформе (рекомендуем)</option>
          <option value="external">По внешней ссылке</option>
        </select>
      </label>
      {values.applyMode === "external" && (
        <label className="company-field">
          Ссылка для отклика *
          <input
            className="company-input"
            value={values.applyUrl}
            onChange={(e) => set("applyUrl", e.target.value)}
            type="url"
            placeholder="https://hh.ru/vacancy/..."
          />
        </label>
      )}

      {error && <p className="company-error">{error}</p>}
      {notice && <p className="company-notice">{notice}</p>}

      {isEdit && status === "published" && !companyTrusted && (
        <div className="panel company-banner company-banner--warn" style={{ margin: 0 }}>
          <p style={{ margin: 0 }}>
            После правки вакансия уйдёт на повторную модерацию и временно пропадёт из каталога.
          </p>
        </div>
      )}

      <div className="company-form-actions">
        <button className="btn-dark" onClick={save} disabled={loading !== null} type="button">
          {loading === "save" ? "Сохраняем..." : isEdit ? "Сохранить" : "Создать черновик"}
        </button>
        {canSubmit && (
          <button
            className="btn-dark btn-dark--success"
            onClick={() => action("submit")}
            disabled={loading !== null || !companyVerified}
            type="button"
            title={companyVerified ? "" : "Доступно после проверки компании"}
          >
            {loading === "submit" ? "Отправляем..." : "Отправить на публикацию"}
          </button>
        )}
        {canArchive && (
          <button className="btn-dark btn-dark--danger" onClick={() => action("archive")} disabled={loading !== null} type="button">
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
        <p className="company-hint">Публикация откроется после проверки компании.</p>
      )}
    </div>
  );
}
