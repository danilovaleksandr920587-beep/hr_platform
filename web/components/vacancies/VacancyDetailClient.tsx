"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SimilarVacancy = {
  slug: string;
  company: string;
  title: string;
  salaryText: string;
  typeLabel: string;
  typeClass: string;
};

type Props = {
  slug: string;
  title: string;
  company: string;
  sphereLabel: string;
  salaryMain: string;
  salaryCompact: string;
  salaryNote: string;
  expLabel: string;
  typeLabel: string;
  formatLabel: string;
  description: string | null;
  featured: boolean;
  publishedAt: string;
  similar: SimilarVacancy[];
};

const SAVE_KEY = "careerlab-saved-vacancies";

function monthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Апрель 2026";
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function VacancyDetailClient(props: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(Array.isArray(list) && list.includes(props.slug));
    } catch {
      setSaved(false);
    }
  }, [props.slug]);

  function toggleSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      const set = new Set(Array.isArray(list) ? list : []);
      if (set.has(props.slug)) set.delete(props.slug);
      else set.add(props.slug);
      localStorage.setItem(SAVE_KEY, JSON.stringify([...set]));
      setSaved(set.has(props.slug));
    } catch {
      setSaved((v) => !v);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
  }

  function telegramShare() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`${props.title} — ${props.company}`);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
  }

  const typeClass =
    props.typeLabel.toLowerCase().includes("стаж")
      ? "kvref-jtag-type-intern"
      : props.typeLabel.toLowerCase().includes("проект")
        ? "kvref-jtag-type-project"
        : "kvref-jtag-type-junior";

  return (
    <div className="kvref">
      <div className="kvref-breadcrumb">
        <Link className="kvref-bc-link" href="/">Главная</Link>
        <span className="kvref-bc-sep">/</span>
        <Link className="kvref-bc-link" href="/vacancies">Вакансии</Link>
        <span className="kvref-bc-sep">/</span>
        <span className="kvref-bc-link">{props.sphereLabel}</span>
        <span className="kvref-bc-sep">/</span>
        <span className="kvref-bc-current">{props.title} — {props.company}</span>
      </div>

      <div className="kvref-layout">
        <div className="kvref-main-col">
          <div className="kvref-vac-header">
            <div className="kvref-vac-header-top">
              <div className="kvref-vac-company-row">
                <div className="kvref-company-logo">{props.company.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="kvref-company-name">{props.company}</div>
                  <div className="kvref-company-meta">{props.sphereLabel} · {props.formatLabel}</div>
                </div>
              </div>

              {props.featured ? <div className="kvref-featured-badge">⭐ Рекомендуем</div> : null}

              <h1 className="kvref-vac-title">{props.title}</h1>

              <div className="kvref-vac-tags">
                <span className="kvref-jtag kvref-jtag-exp">{props.expLabel}</span>
                <span className={`kvref-jtag ${typeClass}`}>{props.typeLabel}</span>
                <span className="kvref-jtag kvref-jtag-format">{props.formatLabel}</span>
                <span className="kvref-jtag kvref-jtag-bonus">Оплачивается</span>
              </div>

              <div className="kvref-vac-salary-row">
                <div className="kvref-vac-salary">{props.salaryMain}</div>
                <div className="kvref-vac-salary-note">{props.salaryNote}</div>
              </div>
            </div>

            <div className="kvref-vac-cta-strip">
              <Link className="kvref-btn-apply-lime" href="/office">Откликнуться</Link>
              <button type="button" className={`kvref-btn-save${saved ? " on" : ""}`} onClick={toggleSave}>
                {saved ? "♥" : "♡"}
              </button>
              <span className="kvref-vac-deadline">Обновлено <strong>{monthYear(props.publishedAt)}</strong></span>
            </div>

            <div className="kvref-conditions-grid">
              <div className="kvref-cond-item"><span className="kvref-cond-label">Формат</span><span className="kvref-cond-value">{props.formatLabel}</span><span className="kvref-cond-sub">Гибкий режим</span></div>
              <div className="kvref-cond-item"><span className="kvref-cond-label">Тип занятости</span><span className="kvref-cond-value">{props.typeLabel}</span><span className="kvref-cond-sub">По вакансии</span></div>
              <div className="kvref-cond-item"><span className="kvref-cond-label">Опыт</span><span className="kvref-cond-value">{props.expLabel}</span><span className="kvref-cond-sub">Смотрите требования</span></div>
            </div>
          </div>

          <div className="kvref-vac-body">
            <div className="kvref-vac-section">
              <div className="kvref-vac-section-title">О роли</div>
              <p className="kvref-body-p">{props.description ?? "Описание будет опубликовано в ближайшее время. Откликайтесь, чтобы команда связалась с вами и рассказала детали по задачам и процессу."}</p>
              <p className="kvref-body-p">Роль открыта для кандидатов, которые хотят быстро расти и решать практические задачи в команде с менторской поддержкой.</p>
            </div>

            <div className="kvref-vac-section">
              <div className="kvref-vac-section-title">Что важно</div>
              <div className="kvref-req-list">
                <div className="kvref-req-item"><div className="kvref-req-dot kvref-req-dot-must">✓</div><div>Базовые навыки по направлению вакансии и готовность учиться быстро</div></div>
                <div className="kvref-req-item"><div className="kvref-req-dot kvref-req-dot-must">✓</div><div>Ответственность за сроки и понятная коммуникация с командой</div></div>
                <div className="kvref-req-item"><div className="kvref-req-dot kvref-req-dot-nice">+</div><div>Проектный опыт (учебный/пет-проекты/фриланс) будет плюсом</div></div>
              </div>
            </div>

            <div className="kvref-vac-section">
              <div className="kvref-vac-section-title">Как откликнуться</div>
              <p className="kvref-body-p">Нажмите «Откликнуться», заполните короткую форму и прикрепите резюме. Команда обычно отвечает в течение 3 рабочих дней.</p>
              <div style={{ marginTop: 20 }}>
                <Link className="kvref-btn-apply-lime" href="/office">Откликнуться на вакансию</Link>
              </div>
            </div>
          </div>
        </div>

        <aside className="kvref-sidebar">
          <div className="kvref-sidebar-apply">
            <div className="kvref-sa-header">
              <div className="kvref-sa-salary">{props.salaryCompact}</div>
              <div className="kvref-sa-title">{props.title} · {props.company}</div>
            </div>
            <div className="kvref-sa-body">
              <Link className="kvref-sa-btn" href="/office">Откликнуться</Link>
              <button type="button" className="kvref-sa-save" onClick={toggleSave}>{saved ? "♥ Сохранено" : "♡ Сохранить вакансию"}</button>
              <div className="kvref-sa-divider" />
              <div className="kvref-sa-meta">
                <div className="kvref-sa-meta-row"><span className="kvref-sa-meta-icon">📍</span><span className="kvref-sa-meta-text"><strong>{props.sphereLabel}</strong></span></div>
                <div className="kvref-sa-meta-row"><span className="kvref-sa-meta-icon">🕐</span><span className="kvref-sa-meta-text"><strong>{props.formatLabel}</strong>, гибкий график</span></div>
                <div className="kvref-sa-meta-row"><span className="kvref-sa-meta-icon">📅</span><span className="kvref-sa-meta-text">Обновлено <strong>{monthYear(props.publishedAt)}</strong></span></div>
              </div>
            </div>
          </div>

          {props.similar.length ? (
            <div className="kvref-similar-block">
              <div className="kvref-sim-header"><div className="kvref-sim-title">Похожие вакансии</div></div>
              {props.similar.map((item) => (
                <Link key={item.slug} className="kvref-sim-item" href={`/vacancies/${item.slug}`}>
                  <div className="kvref-sim-co">{item.company}</div>
                  <div className="kvref-sim-name">{item.title}</div>
                  <div className="kvref-sim-row">
                    <span className="kvref-sim-salary">{item.salaryText}</span>
                    <span className={`kvref-sim-tag ${item.typeClass}`}>{item.typeLabel}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="kvref-share-block">
            <div className="kvref-share-label">Поделиться</div>
            <div className="kvref-share-btns">
              <button type="button" className="kvref-share-btn" onClick={telegramShare}>Telegram</button>
              <button type="button" className="kvref-share-btn" onClick={copyLink}>Скопировать</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
