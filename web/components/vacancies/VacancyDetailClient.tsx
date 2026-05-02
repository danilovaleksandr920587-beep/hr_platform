"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SAVED_ITEMS_EVENT, isVacancySaved, setVacancySaved } from "@/lib/client/saved-items";
import type { VacancyDescriptionBlock } from "@/lib/types";

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
  sphere: string;
  sphereLabel: string;
  salaryMain: string;
  salaryCompact: string;
  salaryNote: string;
  expLabel: string;
  typeLabel: string;
  formatLabel: string;
  description: string | null;
  descriptionBlocks?: VacancyDescriptionBlock[] | null;
  featured: boolean;
  publishedAt: string;
  sourcePublishedAt?: string | null;
  applyUrl?: string | null;
  similar: SimilarVacancy[];
  isArchived?: boolean;
};

function monthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Апрель 2026";
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function VacancyDetailClient(props: Props) {
  const [saved, setSaved] = useState(false);
  const preserveLineBreaks = { whiteSpace: "pre-line" as const };
  const isArchived = props.isArchived ?? false;
  const similarHref = `/vacancies?sphere=${encodeURIComponent(props.sphere)}`;

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

  const roleBlocks = props.descriptionBlocks?.length
    ? props.descriptionBlocks
    : props.description
      ? [{ kind: "other", title: "О роли", body: props.description, items: [] }]
      : [];

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

      {isArchived && (
        <div className="kvref-archive-notice">
          <div className="kvref-archive-notice__icon">🗄</div>
          <div className="kvref-archive-notice__content">
            <p className="kvref-archive-notice__title">Набор завершён</p>
            <span className="kvref-archive-notice__sub">Вакансия закрыта, но описание сохранено — ищите похожие открытые позиции.</span>
          </div>
          <Link href={similarHref} className="kvref-archive-notice__cta">
            Смотреть похожие →
          </Link>
        </div>
      )}

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

              {isArchived && (
                <div className="kvref-archive-badge">Архив</div>
              )}

              {!isArchived && props.featured ? (
                <div className="kvref-featured-badge">⭐ Рекомендуем</div>
              ) : null}

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
              {isArchived ? (
                <>
                  <span className="kvref-archive-status">Набор завершён</span>
                  <Link className="kvref-btn-similar" href={similarHref}>
                    Открытые вакансии →
                  </Link>
                </>
              ) : (
                <Link
                  className="kvref-btn-apply-lime"
                  href={applyHref}
                  target={applyIsExternal ? "_blank" : undefined}
                  rel={applyIsExternal ? "noopener noreferrer" : undefined}
                >
                  Откликнуться
                </Link>
              )}
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
              {roleBlocks.length ? (
                roleBlocks.map((block, idx) => (
                  <div key={`${block.kind}-${idx}`} style={{ marginBottom: 16 }}>
                    <div className="kvref-vac-section-title">{block.title}</div>
                    {block.body ? (
                      <p className="kvref-body-p" style={preserveLineBreaks}>
                        {block.body}
                      </p>
                    ) : null}
                    {block.items?.length ? (
                      <ul className="kvref-body-p" style={{ marginTop: 8, paddingLeft: 18 }}>
                        {block.items.map((item, itemIdx) => (
                          <li key={`${block.kind}-${idx}-${itemIdx}`} style={preserveLineBreaks}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              ) : (
                <>
                  <div className="kvref-vac-section-title">О роли</div>
                  <p className="kvref-body-p">
                    Описание не было получено из источника. Перейдите по кнопке отклика на страницу компании.
                  </p>
                </>
              )}
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
              {!isArchived && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="kvref-sidebar">
          {isArchived ? (
            <div className="kvref-sidebar-apply">
              <div className="kvref-sa-archive-notice">
                <div className="kvref-sa-archive-icon">🗄</div>
                <p className="kvref-sa-archive-title">Набор завершён</p>
                <p className="kvref-sa-archive-sub">
                  Эта вакансия закрыта. Найдите актуальные позиции в сфере {props.sphereLabel}.
                </p>
                <Link className="kvref-sa-archive-btn" href={similarHref}>
                  Смотреть открытые вакансии
                </Link>
              </div>
              <div className="kvref-sa-divider" />
              <div className="kvref-sa-meta">
                <div className="kvref-sa-meta-row"><span className="kvref-sa-meta-icon">📍</span><span className="kvref-sa-meta-text"><strong>{props.sphereLabel}</strong></span></div>
                <div className="kvref-sa-meta-row"><span className="kvref-sa-meta-icon">🕐</span><span className="kvref-sa-meta-text"><strong>{props.formatLabel}</strong></span></div>
                <div className="kvref-sa-meta-row"><span className="kvref-sa-meta-icon">📅</span><span className="kvref-sa-meta-text">Обновлено <strong>{monthYear(props.sourcePublishedAt ?? props.publishedAt)}</strong></span></div>
              </div>
            </div>
          ) : (
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
          )}

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
