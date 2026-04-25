"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SAVED_ITEMS_EVENT, isVacancySaved, setVacancySaved } from "@/lib/client/saved-items";

type SimilarVacancy = {
  slug: string;
  company: string;
  title: string;
  salaryText: string;
  typeLabel: string;
  typeClass: string;
};

type Props = {
  viewerScope?: string | null;
  slug: string;
  title: string;
  company: string;
  companyAbout?: string | null;
  companyLogoUrl?: string | null;
  city?: string | null;
  skills?: string[] | null;
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
  sourcePublishedAt?: string | null;
  applyUrl?: string | null;
  similar: SimilarVacancy[];
};

function monthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Апрель 2026";
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function VacancyDetailClient(props: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(isVacancySaved(props.slug, props.viewerScope));
    sync();
    window.addEventListener(SAVED_ITEMS_EVENT, sync);
    return () => window.removeEventListener(SAVED_ITEMS_EVENT, sync);
  }, [props.slug, props.viewerScope]);

  function toggleSave() {
    const next = !saved;
    setVacancySaved(props.slug, next, props.viewerScope);
    setSaved(next);
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
  const applyHref = props.applyUrl || "/office";
  const applyIsExternal = Boolean(props.applyUrl);

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
                <div className="kvref-company-logo">
                  {props.companyLogoUrl ? (
                    <img
                      src={props.companyLogoUrl}
                      alt={props.company}
                      style={{ width: 36, height: 36, objectFit: "contain" }}
                    />
                  ) : (
                    props.company.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="kvref-company-name">{props.company}</div>
                  <div className="kvref-company-meta">
                    {props.sphereLabel} · {props.formatLabel}
                    {props.city ? ` · ${props.city}` : ""}
                  </div>
                </div>
              </div>

              {props.featured ? <div className="kvref-featured-badge">⭐ Рекомендуем</div> : null}

              <h1 className="kvref-vac-title">{props.title}</h1>

              <div className="kvref-vac-tags">
                <span className="kvref-jtag kvref-jtag-exp">{props.expLabel}</span>
                <span className={`kvref-jtag ${typeClass}`}>{props.typeLabel}</span>
                <span className="kvref-jtag kvref-jtag-format">{props.formatLabel}</span>
              </div>

              <div className="kvref-vac-salary-row">
                <div className="kvref-vac-salary">{props.salaryMain}</div>
                <div className="kvref-vac-salary-note">{props.salaryNote}</div>
              </div>
            </div>

            <div className="kvref-vac-cta-strip">
              <Link
                className="kvref-btn-apply-lime"
                href={applyHref}
                target={applyIsExternal ? "_blank" : undefined}
                rel={applyIsExternal ? "noopener noreferrer" : undefined}
              >
                Откликнуться
              </Link>
              <button type="button" className={`kvref-btn-save${saved ? " on" : ""}`} onClick={toggleSave}>
                {saved ? "♥" : "♡"}
              </button>
              <span className="kvref-vac-deadline">
                Обновлено <strong>{monthYear(props.sourcePublishedAt ?? props.publishedAt)}</strong>
              </span>
            </div>

            <div className="kvref-conditions-grid">
              <div className="kvref-cond-item"><span className="kvref-cond-label">Формат</span><span className="kvref-cond-value">{props.formatLabel}</span></div>
              <div className="kvref-cond-item"><span className="kvref-cond-label">Тип занятости</span><span className="kvref-cond-value">{props.typeLabel}</span></div>
              <div className="kvref-cond-item"><span className="kvref-cond-label">Опыт</span><span className="kvref-cond-value">{props.expLabel}</span></div>
            </div>
          </div>

          <div className="kvref-vac-body">
            {props.companyAbout ? (
              <div className="kvref-vac-section">
                <div className="kvref-vac-section-title">О компании</div>
                <p className="kvref-body-p">{props.companyAbout}</p>
              </div>
            ) : null}
            <div className="kvref-vac-section">
              <div className="kvref-vac-section-title">О роли</div>
              <p className="kvref-body-p">
                {props.description ??
                  "Описание не было получено из источника. Перейдите по кнопке отклика на страницу компании."}
              </p>
            </div>

            {props.skills?.length ? (
              <div className="kvref-vac-section">
                <div className="kvref-vac-section-title">Навыки</div>
                <div className="kvref-vac-tags">
                  {props.skills.map((skill) => (
                    <span key={skill} className="kvref-jtag kvref-jtag-format">{skill}</span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="kvref-vac-section">
              <div className="kvref-vac-section-title">Как откликнуться</div>
              <p className="kvref-body-p">Нажмите «Откликнуться», заполните короткую форму и прикрепите резюме. Команда обычно отвечает в течение 3 рабочих дней.</p>
              <div style={{ marginTop: 20 }}>
                <Link
                  className="kvref-btn-apply-lime"
                  href={applyHref}
                  target={applyIsExternal ? "_blank" : undefined}
                  rel={applyIsExternal ? "noopener noreferrer" : undefined}
                >
                  Откликнуться на вакансию
                </Link>
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
              <Link
                className="kvref-sa-btn"
                href={applyHref}
                target={applyIsExternal ? "_blank" : undefined}
                rel={applyIsExternal ? "noopener noreferrer" : undefined}
              >
                Откликнуться
              </Link>
              <button type="button" className="kvref-sa-save" onClick={toggleSave}>{saved ? "♥ Сохранено" : "♡ Сохранить вакансию"}</button>
              <div className="kvref-sa-divider" />
              <div className="kvref-sa-meta">
                <div className="kvref-sa-meta-row"><span className="kvref-sa-meta-icon">📍</span><span className="kvref-sa-meta-text"><strong>{props.sphereLabel}</strong></span></div>
                <div className="kvref-sa-meta-row"><span className="kvref-sa-meta-icon">🕐</span><span className="kvref-sa-meta-text"><strong>{props.formatLabel}</strong></span></div>
                <div className="kvref-sa-meta-row"><span className="kvref-sa-meta-icon">📅</span><span className="kvref-sa-meta-text">Обновлено <strong>{monthYear(props.sourcePublishedAt ?? props.publishedAt)}</strong></span></div>
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
