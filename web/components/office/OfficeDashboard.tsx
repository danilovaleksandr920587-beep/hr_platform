"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

type OfficeDashboardProps = {
  email: string;
  displayName?: string | null;
};

function firstNameFrom(email: string, displayName?: string | null) {
  const n = displayName?.trim();
  if (n) return n.split(/\s+/)[0] ?? n;
  return email.split("@")[0] ?? "друг";
}

function initialsFrom(email: string, displayName?: string | null) {
  const n = displayName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase() || a.toUpperCase() || email.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function fullNamePlaceholder(email: string, displayName?: string | null) {
  const n = displayName?.trim();
  if (n) return n;
  return email;
}

const JOBS: {
  co: string;
  title: string;
  salary: string;
  tags: { text: string; cls: string }[];
  date: string;
}[] = [
  {
    co: "Яндекс",
    title: "Junior Python Developer",
    salary: "100–140 000 ₽",
    tags: [
      { text: "Junior", cls: "jtag jtag-type-junior" },
      { text: "Гибрид", cls: "jtag jtag-format" },
      { text: "Москва", cls: "jtag jtag-format" },
      { text: "Python · Django · SQL", cls: "jtag jtag-exp" },
    ],
    date: "2 дня назад",
  },
  {
    co: "Ozon",
    title: "Junior Data Analyst",
    salary: "90–120 000 ₽",
    tags: [
      { text: "Junior", cls: "jtag jtag-type-junior" },
      { text: "Удалённо", cls: "jtag jtag-format" },
      { text: "SQL · Python · Tableau", cls: "jtag jtag-exp" },
    ],
    date: "3 дня назад",
  },
  {
    co: "Сбер",
    title: "Frontend-разработчик (стажёр)",
    salary: "80–100 000 ₽",
    tags: [
      { text: "Стажировка", cls: "jtag jtag-type-intern" },
      { text: "Офис · Москва", cls: "jtag jtag-format" },
      { text: "React · TypeScript", cls: "jtag jtag-exp" },
    ],
    date: "5 дней назад",
  },
  {
    co: "Kaspersky",
    title: "QA Engineer Junior",
    salary: "85–115 000 ₽",
    tags: [
      { text: "Junior", cls: "jtag jtag-type-junior" },
      { text: "Гибрид · Москва", cls: "jtag jtag-format" },
      { text: "Selenium · Python", cls: "jtag jtag-exp" },
    ],
    date: "1 неделю назад",
  },
];

const ARTICLES = [
  {
    href: "/knowledge-base/resume",
    visual: "cv-resume",
    icon: "📄",
    stat: "CV",
    ctag: "ctag-resume",
    tag: "Резюме",
    time: "7 мин",
    title: "Как написать резюме без опыта работы",
  },
  {
    href: "/knowledge-base/interview",
    visual: "cv-interview",
    icon: "🎤",
    stat: "20",
    ctag: "ctag-interview",
    tag: "Интервью",
    time: "12 мин",
    title: "Топ-20 вопросов на собеседовании в IT",
  },
  {
    href: "/knowledge-base/salary",
    visual: "cv-salary",
    icon: "💰",
    stat: "₽",
    ctag: "ctag-salary",
    tag: "Зарплаты",
    time: "5 мин",
    title: "Зарплаты Junior-разработчиков в 2025",
  },
] as const;

type SectionId = "resume" | "salary" | "checklist" | "vacancies" | "articles";

export function OfficeDashboard({ email, displayName }: OfficeDashboardProps) {
  const first = firstNameFrom(email, displayName);
  const initials = initialsFrom(email, displayName);
  const fullName = fullNamePlaceholder(email, displayName);

  const [modalOpen, setModalOpen] = useState(false);
  const [resumeEvaluated, setResumeEvaluated] = useState(true);
  const [activeNav, setActiveNav] = useState<SectionId>("resume");

  const [checkRows, setCheckRows] = useState([
    { id: "1", done: true, label: "Резюме загружено и оценено", href: null as string | null },
    { id: "2", done: true, label: "Заполнен профиль: направление и уровень", href: null },
    { id: "3", done: true, label: "Прочитан гайд «Как написать резюме»", href: "/knowledge-base/resume" },
    {
      id: "4",
      done: false,
      label: "Подготовься к интервью — пройди тест на знание стека",
      href: "/knowledge-base/interview",
    },
    { id: "5", done: false, label: "Добавь GitHub или портфолио в резюме", href: "/knowledge-base/resume" },
    { id: "6", done: false, label: "Сохрани 5 подходящих вакансий из подборки", href: "/vacancies" },
    { id: "7", done: false, label: "Изучи зарплатный рынок в своём направлении", href: "/tools/salary-calculator" },
  ]);

  const progress = useMemo(() => {
    const done = checkRows.filter((r) => r.done).length;
    const pct = Math.round((done / checkRows.length) * 100);
    const offset = 163 * (1 - done / checkRows.length);
    return { pct, offset, done };
  }, [checkRows]);

  const scrollTo = useCallback((id: SectionId) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const toggleCheck = useCallback((id: string) => {
    setCheckRows((rows) => rows.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  }, []);

  const closeModalBg = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setModalOpen(false);
  }, []);

  const fpHeaderStyle = useMemo(
    () => ({ flexDirection: "column" as const, alignItems: "flex-start" as const, gap: 12 }),
    [],
  );
  const rowBetweenStyle = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    }),
    [],
  );
  const flexGap12 = useMemo(() => ({ display: "flex", alignItems: "center", gap: 12 }), []);
  const mainColStyle = useMemo(() => ({ display: "flex", flexDirection: "column" as const, gap: 24 }), []);
  const statGreen = useMemo(() => ({ color: "#3a5a00" }), []);
  const chipsMb = useMemo(() => ({ marginBottom: 14 }), []);
  const resumeActionsStyle = useMemo(() => ({ display: "flex", gap: 10, marginTop: 14 }), []);
  const panelPad = useMemo(() => ({ padding: 24 }), []);
  const progressHeaderStyle = useMemo(
    () => ({ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }),
    [],
  );
  const checklistColStyle = useMemo(
    () => ({ display: "flex", flexDirection: "column" as const, gap: 6 }),
    [],
  );
  const shMedianHint = useMemo(
    () => ({ fontSize: 12, color: "rgba(255,255,255,.3)" }),
    [],
  );
  const rangeFillStyle = useMemo(() => ({ left: 0, width: "70%" }), []);
  const rangeLineStyle = useMemo(() => ({ left: "55%" }), []);
  const titleRowStyle = useMemo(() => ({ display: "flex", alignItems: "center", gap: 8 }), []);
  const toggleLabelStyle = useMemo(() => ({ fontSize: 11, color: "var(--muted)" }), []);
  const avatarSmStyle = useMemo(
    () => ({ width: 48, height: 48, fontSize: 15, margin: 0 }),
    [],
  );
  const nameSmStyle = useMemo(() => ({ fontSize: 13 }), []);
  const unboundedTitleStyle = useMemo(
    () => ({
      fontFamily: "'Unbounded',sans-serif",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--dark)",
      marginBottom: 3,
    }),
    [],
  );
  const muted13 = useMemo(() => ({ fontSize: 13, color: "var(--muted)" }), []);
  const filterGroupsStyle = useMemo(() => ({ padding: 0 }), []);

  return (
    <div className="office-mockup">
      <div className="page-header">
        <div className="page-header-inner">
          <div className="ph-eyebrow">Личный кабинет</div>
          <h1 className="ph-title">Привет, {first} 👋</h1>
          <p className="ph-sub">Здесь всё, что нужно для успешного поиска работы</p>
        </div>
      </div>

      <div className="jl-section">
        <div className="jl-grid">
          <aside>
            <div className="filter-panel">
              <div className="filter-panel-inner">
                <div className="filter-panel-header" style={fpHeaderStyle}>
                  <div style={rowBetweenStyle}>
                    <span className="filter-panel-heading">Профиль</span>
                    <button type="button" className="filter-reset-link" onClick={() => setModalOpen(true)}>
                      Изменить →
                    </button>
                  </div>
                  <div style={flexGap12}>
                    <div className="office-avatar" style={avatarSmStyle}>
                      {initials}
                    </div>
                    <div>
                      <div className="office-name" style={nameSmStyle}>
                        {fullName}
                      </div>
                      <div className="office-email">{email}</div>
                    </div>
                  </div>
                  <span className="office-badge">IT · Junior</span>
                </div>

                <div className="filter-groups" style={filterGroupsStyle}>
                  {(
                    [
                      ["resume", "📄", "Резюме", null],
                      ["salary", "💰", "Зарплата", null],
                      ["checklist", "✅", "Готовность", `${progress.pct}%`],
                      ["vacancies", "🔖", "Подборка", "4"],
                      ["articles", "📚", "Статьи", "4"],
                    ] as const
                  ).map(([id, icon, label, count]) => (
                    <button
                      key={id}
                      type="button"
                      className={`office-nav-link${activeNav === id ? " active" : ""}`}
                      onClick={() => scrollTo(id)}
                    >
                      <span className="nav-icon">{icon}</span> {label}
                      {count ? <span className="nav-count">{count}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main style={mainColStyle}>
            <div className="home-stats">
              <div className="home-stat">
                <div className="home-stat-num">12</div>
                <div className="home-stat-label">Вакансий сохранено</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-num" style={statGreen}>
                  72
                </div>
                <div className="home-stat-label">Балл резюме</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-num" style={statGreen}>
                  115k
                </div>
                <div className="home-stat-label">Медиана зарплат · IT Junior</div>
              </div>
            </div>

            <div id="resume">
              <div className="section-hdr">
                <span className="section-hdr-title">Оценка резюме</span>
                <div style={titleRowStyle}>
                  <span style={toggleLabelStyle}>
                    {resumeEvaluated ? "Показать без оценки" : "Показать результат"}
                  </span>
                  <button type="button" className="demo-toggle-btn" onClick={() => setResumeEvaluated((v) => !v)}>
                    ↕ переключить
                  </button>
                </div>
              </div>

              {!resumeEvaluated ? (
                <div className="ranalyzer">
                  <Link
                    href="/tools/resume-analyzer"
                    className="upload-zone"
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    <div className="upload-icon">📄</div>
                    <div className="upload-title">Резюме ещё не оценено</div>
                    <div className="upload-sub">
                      Загрузи резюме — ИИ проверит структуру, ключевые слова
                      <br />
                      и соответствие вакансиям. Займёт меньше минуты.
                    </div>
                    <span className="btn-primary" style={{ margin: "0 auto", display: "table" }}>
                      Оценить резюме →
                    </span>
                  </Link>
                </div>
              ) : (
                <div className="ranalyzer">
                  <div className="result-score">
                    <div className="score-circle">
                      <span className="score-num">72</span>
                    </div>
                    <div>
                      <div className="score-title">Хорошее резюме</div>
                      <div className="score-sub">
                        Есть точки роста — исправь их, чтобы попасть в топ кандидатов
                      </div>
                    </div>
                  </div>
                  <div className="result-sections">
                    <div className="result-section">
                      <div className="result-section-header">
                        <span className="rsh-title">Структура и форматирование</span>
                        <span className="rsh-badge badge-good">Хорошо</span>
                      </div>
                      <div className="result-section-body">
                        <div className="issue-item">
                          <div className="issue-dot dot-green" />
                          <div className="issue-text">
                            <strong>Чёткая структура по стандарту</strong>
                            <div className="issue-fix">Блоки расположены логично, читается с первого взгляда</div>
                          </div>
                        </div>
                        <div className="issue-item">
                          <div className="issue-dot dot-green" />
                          <div className="issue-text">
                            <strong>Контактные данные заполнены</strong>
                            <div className="issue-fix">Email и телефон на месте</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="result-section">
                      <div className="result-section-header">
                        <span className="rsh-title">Навыки и ключевые слова</span>
                        <span className="rsh-badge badge-warn">Улучшить</span>
                      </div>
                      <div className="result-section-body">
                        <div className="issue-item">
                          <div className="issue-dot dot-green" />
                          <div className="issue-text">
                            <strong>Python, SQL, Pandas — присутствуют</strong>
                            <div className="issue-fix">Ключевые стеки для IT-аналитики</div>
                          </div>
                        </div>
                        <div className="issue-item">
                          <div className="issue-dot dot-yellow" />
                          <div className="issue-text">
                            <strong>Описание опыта слишком общее</strong>
                            <div className="issue-fix">
                              Используй цифры и конкретные результаты: «вырос на 20%», «обработал 50k записей»
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="result-section">
                      <div className="result-section-header">
                        <span className="rsh-title">Проекты и портфолио</span>
                        <span className="rsh-badge badge-crit">Важно</span>
                      </div>
                      <div className="result-section-body">
                        <div className="issue-item">
                          <div className="issue-dot dot-red" />
                          <div className="issue-text">
                            <strong>Нет ссылки на GitHub или портфолио</strong>
                            <div className="issue-fix">Для IT-вакансий это критично — добавь хотя бы один пет-проект</div>
                          </div>
                        </div>
                        <div className="issue-item">
                          <div className="issue-dot dot-yellow" />
                          <div className="issue-text">
                            <strong>Раздел проектов отсутствует</strong>
                            <div className="issue-fix">Добавь 1–2 учебных проекта с описанием стека и результата</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={resumeActionsStyle}>
                    <Link
                      href="/tools/resume-analyzer"
                      className="btn-primary"
                      style={{ textAlign: "center", textDecoration: "none", display: "inline-block" }}
                    >
                      Переоценить резюме
                    </Link>
                    <button type="button" className="btn-outline">
                      Скачать отчёт
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div id="salary">
              <div className="section-hdr">
                <span className="section-hdr-title">Зарплата по профилю</span>
                <Link href="/tools/salary-calculator" className="section-hdr-link">
                  Открыть калькулятор →
                </Link>
              </div>

              <div className="chips" style={chipsMb}>
                <span className="chip">IT</span>
                <span className="chip">Junior</span>
                <span className="chip">Москва</span>
                <span className="chip">Гибрид</span>
              </div>

              <div className="scalc">
                <div className="salary-hero">
                  <div className="sh-label">Диапазон зарплат</div>
                  <div className="sh-role">IT · Junior · Москва · Гибрид</div>
                  <div className="sh-range">
                    <span className="sh-from">80 000</span>
                    <span className="sh-dash">—</span>
                    <span className="sh-to">150 000 ₽</span>
                  </div>
                  <div className="sh-median">
                    <span style={shMedianHint}>Медиана рынка</span>
                    <span className="sh-median-val">115 000 ₽</span>
                    <span className="sh-median-badge">Апрель 2025</span>
                  </div>
                </div>

                <div className="range-bar-card">
                  <div className="rbc-title">Распределение по рынку</div>
                  <div className="range-track">
                    <div className="range-fill" style={rangeFillStyle} />
                    <div className="range-median-line" style={rangeLineStyle} />
                  </div>
                  <div className="range-markers">
                    <span>80 000 ₽</span>
                    <span>115 000 ₽</span>
                    <span>150 000 ₽</span>
                  </div>
                </div>

                <div className="ai-insight">
                  <div className="ai-header">
                    <div className="ai-dot" />
                    <div className="ai-header-title">Инсайт по твоему профилю</div>
                  </div>
                  <div className="ai-text">
                    При переходе на удалённый формат Junior IT-специалисты в Москве зарабатывают в среднем на{" "}
                    <strong>10–15 000 ₽</strong> больше. Также добавление навыков BI-инструментов (Tableau, Power BI)
                    смещает медиану вверх на ~<strong>8 000 ₽</strong>.
                  </div>
                </div>

                <div className="tips-card">
                  <div className="tips-title">
                    Как <em>увеличить</em> зарплату
                  </div>
                  <div className="tip-row">
                    <span className="tip-row-num">01</span>
                    <span className="tip-row-text">
                      Добавь GitHub с реальными проектами — это сдвигает оффер на 10–20% выше рынка
                    </span>
                  </div>
                  <div className="tip-row">
                    <span className="tip-row-num">02</span>
                    <span className="tip-row-text">
                      Указывай результаты в цифрах в резюме — HR воспринимает это как опыт выше уровня
                    </span>
                  </div>
                  <div className="tip-row">
                    <span className="tip-row-num">03</span>
                    <span className="tip-row-text">
                      Рассмотри продуктовые компании — они платят Junior на 15–25% больше аутсорса
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div id="checklist">
              <div className="section-hdr">
                <span className="section-hdr-title">Готовность к поиску работы</span>
              </div>

              <div className="panel" style={panelPad}>
                <div style={progressHeaderStyle}>
                  <div className="progress-ring-wrap">
                    <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden>
                      <circle className="prg-bg" cx="30" cy="30" r="26" />
                      <circle
                        className="prg-fill"
                        cx="30"
                        cy="30"
                        r="26"
                        style={{ strokeDashoffset: progress.offset }}
                      />
                    </svg>
                    <div className="prg-label">{progress.pct}%</div>
                  </div>
                  <div>
                    <div style={unboundedTitleStyle}>Ты на верном пути</div>
                    <div style={muted13}>Закрой оставшиеся пункты — это повышает шанс получить оффер</div>
                  </div>
                </div>

                <div style={checklistColStyle}>
                  {checkRows.map((row) => (
                    <div
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      className={`check-row${row.done ? " done" : ""}`}
                      onClick={() => toggleCheck(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleCheck(row.id);
                        }
                      }}
                    >
                      <div className="check-box">{row.done ? "✓" : ""}</div>
                      <span className="check-label">{row.label}</span>
                      {row.href ? (
                        <Link href={row.href} className="check-cta" onClick={(e) => e.stopPropagation()}>
                          {row.id === "4" ? "Пройти →" : row.id === "5" ? "Гайд →" : row.id === "6" ? "Смотреть →" : "Калькулятор →"}
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div id="vacancies">
              <div className="section-hdr">
                <span className="section-hdr-title">Подборка для тебя</span>
                <Link href="/vacancies" className="section-hdr-link">
                  Все вакансии →
                </Link>
              </div>
              <div className="section-badge">На основе профиля: IT · Junior · Москва</div>

              <div className="jobs-list">
                {JOBS.map((job) => (
                  <div key={job.title} className="job-card">
                    <div className="job-card-top">
                      <div className="job-card-left">
                        <div className="job-co">{job.co}</div>
                        <h3 className="job-title">{job.title}</h3>
                      </div>
                      <div className="job-salary-block">
                        <span className="job-salary">{job.salary}</span>
                      </div>
                    </div>
                    <ul className="job-tags">
                      {job.tags.map((t) => (
                        <li key={t.text}>
                          <span className={t.cls}>{t.text}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="job-card-bottom">
                      <div className="job-actions">
                        <div className="tooltip-wrap">
                          <button type="button" className="job-btn-primary">
                            Откликнуться
                          </button>
                          <div className="tooltip-pop">Откроет email HR-менеджера</div>
                        </div>
                        <Link
                          href="/vacancies"
                          className="job-btn-secondary"
                          style={{ textDecoration: "none" }}
                        >
                          Подробнее
                        </Link>
                      </div>
                      <span className="job-date">{job.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div id="articles">
              <div className="section-hdr">
                <span className="section-hdr-title">Сохранённые статьи</span>
                <Link href="/knowledge-base" className="section-hdr-link">
                  В базу знаний →
                </Link>
              </div>

              <div className="articles-grid">
                {ARTICLES.map((a) => (
                  <Link key={a.href} href={a.href} className="article-card" style={{ textDecoration: "none", color: "inherit" }}>
                    <div className={`card-visual ${a.visual}`}>
                      <span className="card-visual-icon">{a.icon}</span>
                      <div className="card-visual-preview">
                        <div className="cvp-line cvp-line-long" />
                        <div className="cvp-line cvp-line-mid" />
                        <div className="cvp-line cvp-line-short" />
                      </div>
                      <span className="card-visual-stat">{a.stat}</span>
                    </div>
                    <div className="card-body">
                      <div className="card-tags">
                        <span className={`ctag ${a.ctag}`}>{a.tag}</span>
                        <span className="ctag ctag-time">{a.time}</span>
                      </div>
                      <h3 className="card-title">{a.title}</h3>
                      <div className="card-footer">
                        <span className="card-read-btn">Читать</span>
                        <span className="card-save" aria-hidden>
                          🔖
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>

      <div
        className={`modal-overlay${modalOpen ? " open" : ""}`}
        onClick={closeModalBg}
        role="presentation"
      >
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="office-modal-title">
          <div className="modal-title" id="office-modal-title">
            Редактировать профиль
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="office-fn">
                Имя
              </label>
              <input className="form-input" id="office-fn" type="text" defaultValue={first} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="office-ln">
                Фамилия
              </label>
              <input className="form-input" id="office-ln" type="text" defaultValue="" placeholder="Фамилия" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="office-dir">
              Направление
            </label>
            <select className="form-select" id="office-dir" defaultValue="IT">
              <option>IT</option>
              <option>Аналитика</option>
              <option>Финансы</option>
              <option>Маркетинг</option>
              <option>Управление</option>
              <option>Дизайн</option>
              <option>QA</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="office-lvl">
                Уровень
              </label>
              <select className="form-select" id="office-lvl" defaultValue="Junior">
                <option>Стажёр</option>
                <option>Junior</option>
                <option>Middle</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="office-fmt">
                Формат
              </label>
              <select className="form-select" id="office-fmt" defaultValue="Гибрид">
                <option>Не важно</option>
                <option>Гибрид</option>
                <option>Удалённо</option>
                <option>Офис</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="office-city">
              Город
            </label>
            <input className="form-input" id="office-city" type="text" defaultValue="Москва" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-save" onClick={() => setModalOpen(false)}>
              Сохранить
            </button>
            <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
