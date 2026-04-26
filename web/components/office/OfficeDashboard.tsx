"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SAVED_ITEMS_EVENT, readSavedSnapshot } from "@/lib/client/saved-items";
import { InlineResumeAnalyzer } from "@/components/office/InlineResumeAnalyzer";

type OfficeDashboardProps = {
  userScope: string;
  email: string;
  displayName?: string | null;
};

function initialsFrom(name: string, surname: string, email: string) {
  const a = name.trim()[0] ?? "";
  const b = surname.trim()[0] ?? "";
  if (a || b) return (a + b).toUpperCase();
  return email.slice(0, 2).toUpperCase();
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

// Parse displayName into first + surname
function parseName(displayName?: string | null, email?: string) {
  const n = displayName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    return { firstName: parts[0] ?? "", surname: parts.slice(1).join(" ") };
  }
  return { firstName: email?.split("@")[0] ?? "", surname: "" };
}

export function OfficeDashboard({ userScope, email, displayName }: OfficeDashboardProps) {
  const parsed = parseName(displayName, email);

  // Profile state (controlled)
  const [profileFirstName, setProfileFirstName] = useState(parsed.firstName);
  const [profileSurname, setProfileSurname] = useState(parsed.surname);
  const [profileDirection, setProfileDirection] = useState("IT");
  const [profileLevel, setProfileLevel] = useState("Junior");
  const [profileFormat, setProfileFormat] = useState("Гибрид");
  const [profileCity, setProfileCity] = useState("Москва");

  // Derived display values
  const displayFirstName = profileFirstName || email.split("@")[0] || "друг";
  const displayFullName = [profileFirstName, profileSurname].filter(Boolean).join(" ") || email;
  const initials = initialsFrom(profileFirstName, profileSurname, email);
  const profileBadge = `${profileDirection} · ${profileLevel}`;

  const [modalOpen, setModalOpen] = useState(false);
  // Temp form state (in-modal, applied only on save)
  const [formFn, setFormFn] = useState(profileFirstName);
  const [formLn, setFormLn] = useState(profileSurname);
  const [formDir, setFormDir] = useState(profileDirection);
  const [formLvl, setFormLvl] = useState(profileLevel);
  const [formFmt, setFormFmt] = useState(profileFormat);
  const [formCity, setFormCity] = useState(profileCity);

  function openModal() {
    setFormFn(profileFirstName);
    setFormLn(profileSurname);
    setFormDir(profileDirection);
    setFormLvl(profileLevel);
    setFormFmt(profileFormat);
    setFormCity(profileCity);
    setModalOpen(true);
  }

  function saveProfile() {
    setProfileFirstName(formFn);
    setProfileSurname(formLn);
    setProfileDirection(formDir);
    setProfileLevel(formLvl);
    setProfileFormat(formFmt);
    setProfileCity(formCity);
    setModalOpen(false);
  }

  const [loggingOut, setLoggingOut] = useState(false);
  const [resumeScore, setResumeScore] = useState<number | null>(null);
  const [activeNav, setActiveNav] = useState<SectionId>("resume");
  const [savedCounts, setSavedCounts] = useState({ vacancies: 0, articles: 0 });

  const [checkRows, setCheckRows] = useState([
    { id: "1", done: false, label: "Резюме загружено и оценено", href: null as string | null },
    { id: "2", done: false, label: "Заполнен профиль: направление и уровень", href: null },
    { id: "3", done: false, label: "Прочитан гайд «Как написать резюме»", href: "/knowledge-base/resume" },
    { id: "4", done: false, label: "Подготовься к интервью — пройди тест на знание стека", href: "/knowledge-base/interview" },
    { id: "5", done: false, label: "Добавь GitHub или портфолио в резюме", href: "/knowledge-base/resume" },
    { id: "6", done: false, label: "Сохрани 5 подходящих вакансий из подборки", href: "/vacancies" },
    { id: "7", done: false, label: "Изучи зарплатный рынок в своём направлении", href: "/tools/salary-calculator" },
  ]);

  const handleScoreChange = useCallback((score: number | null) => {
    setResumeScore(score);
    if (score !== null) {
      setCheckRows((rows) => rows.map((r) => (r.id === "1" ? { ...r, done: true } : r)));
    }
  }, []);

  const progress = useMemo(() => {
    const done = checkRows.filter((r) => r.done).length;
    const pct = Math.round((done / checkRows.length) * 100);
    const offset = 163 * (1 - done / checkRows.length);
    return { pct, offset, done };
  }, [checkRows]);

  useEffect(() => {
    const sync = () => {
      const snapshot = readSavedSnapshot(userScope);
      setSavedCounts({
        vacancies: snapshot.vacancies.size,
        articles: snapshot.articles.size,
      });
    };
    sync();
    window.addEventListener(SAVED_ITEMS_EVENT, sync);
    return () => window.removeEventListener(SAVED_ITEMS_EVENT, sync);
  }, [userScope]);

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

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
    }
  }, []);

  const mainColStyle = useMemo(() => ({ display: "flex", flexDirection: "column" as const, gap: 24 }), []);
  const statGreen = useMemo(() => ({ color: "#3a5a00" }), []);
  const chipsMb = useMemo(() => ({ marginBottom: 14 }), []);
  const panelPad = useMemo(() => ({ padding: 24 }), []);
  const progressHeaderStyle = useMemo(() => ({ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }), []);
  const checklistColStyle = useMemo(() => ({ display: "flex", flexDirection: "column" as const, gap: 6 }), []);
  const shMedianHint = useMemo(() => ({ fontSize: 12, color: "rgba(255,255,255,.3)" }), []);
  const rangeFillStyle = useMemo(() => ({ left: 0, width: "70%" }), []);
  const rangeLineStyle = useMemo(() => ({ left: "55%" }), []);
  const unboundedTitleStyle = useMemo(() => ({ fontFamily: "'Unbounded',sans-serif", fontSize: 14, fontWeight: 700, color: "var(--dark)", marginBottom: 3 }), []);
  const muted13 = useMemo(() => ({ fontSize: 13, color: "var(--muted)" }), []);

  return (
    <div className="office-mockup">
      <div className="page-header">
        <div className="page-header-inner">
          <div className="ph-eyebrow">Личный кабинет</div>
          <h1 className="ph-title">Привет, {displayFirstName} 👋</h1>
          <p className="ph-sub">Здесь всё, что нужно для успешного поиска работы</p>
        </div>
      </div>

      <div className="jl-section">
        <div className="jl-grid">
          <aside>
            <div className="filter-panel">
              <div className="filter-panel-inner">
                <div className="filter-panel-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <span className="filter-panel-heading">Профиль</span>
                    <button type="button" className="filter-reset-link" onClick={openModal}>Изменить →</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="office-avatar" style={{ width: 48, height: 48, fontSize: 15, margin: 0 }}>{initials}</div>
                    <div>
                      <div className="office-name" style={{ fontSize: 13 }}>{displayFullName}</div>
                      <div className="office-email">{email}</div>
                    </div>
                  </div>
                  <span className="office-badge">{profileBadge}</span>
                </div>

                <div className="filter-groups" style={{ padding: 0 }}>
                  {(
                    [
                      ["resume", "📄", "Резюме", null],
                      ["salary", "💰", "Зарплата", null],
                      ["checklist", "✅", "Готовность", `${progress.pct}%`],
                      ["vacancies", "🔖", "Подборка", String(savedCounts.vacancies)],
                      ["articles", "📚", "Статьи", String(savedCounts.articles)],
                    ] as const
                  ).map(([id, icon, label, count]) =>
                    id === "vacancies" ? (
                      <Link key={id} href="/office/saved-vacancies" className="office-nav-link">
                        <span className="nav-icon">{icon}</span> {label}
                        {count ? <span className="nav-count">{count}</span> : null}
                      </Link>
                    ) : (
                      <button
                        key={id}
                        type="button"
                        className={`office-nav-link${activeNav === id ? " active" : ""}`}
                        onClick={() => scrollTo(id)}
                      >
                        <span className="nav-icon">{icon}</span> {label}
                        {count ? <span className="nav-count">{count}</span> : null}
                      </button>
                    )
                  )}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border2)" }}>
                    <button
                      type="button"
                      className="office-nav-link"
                      onClick={() => void handleLogout()}
                      disabled={loggingOut}
                    >
                      <span className="nav-icon">⎋</span> {loggingOut ? "Выход…" : "Выйти"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main style={mainColStyle}>
            <div className="home-stats">
              <div className="home-stat">
                <div className="home-stat-num">{savedCounts.vacancies}</div>
                <div className="home-stat-label">Вакансий сохранено</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-num" style={statGreen}>
                  {resumeScore !== null ? resumeScore : "—"}
                </div>
                <div className="home-stat-label">Балл резюме</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-num" style={statGreen}>115k</div>
                <div className="home-stat-label">Медиана зарплат · IT Junior</div>
              </div>
            </div>

            {/* ── Resume section ── */}
            <div id="resume">
              <div className="section-hdr">
                <span className="section-hdr-title">Оценка резюме</span>
                <Link href="/tools/resume-analyzer" className="section-hdr-link" style={{ fontSize: 12 }}>
                  Оценить под вакансию →
                </Link>
              </div>
              <InlineResumeAnalyzer userScope={userScope} onScoreChange={handleScoreChange} />
            </div>

            {/* ── Salary section ── */}
            <div id="salary">
              <div className="section-hdr">
                <span className="section-hdr-title">Зарплата по профилю</span>
                <Link href="/tools/salary-calculator" className="section-hdr-link">Открыть калькулятор →</Link>
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
                    <span className="sh-median-badge">Апрель 2026</span>
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
                  <div className="tips-title">Как <em>увеличить</em> зарплату</div>
                  <div className="tip-row"><span className="tip-row-num">01</span><span className="tip-row-text">Добавь GitHub с реальными проектами — это сдвигает оффер на 10–20% выше рынка</span></div>
                  <div className="tip-row"><span className="tip-row-num">02</span><span className="tip-row-text">Указывай результаты в цифрах в резюме — HR воспринимает это как опыт выше уровня</span></div>
                  <div className="tip-row"><span className="tip-row-num">03</span><span className="tip-row-text">Рассмотри продуктовые компании — они платят Junior на 15–25% больше аутсорса</span></div>
                </div>
              </div>
            </div>

            {/* ── Checklist ── */}
            <div id="checklist">
              <div className="section-hdr">
                <span className="section-hdr-title">Готовность к поиску работы</span>
              </div>
              <div className="panel" style={panelPad}>
                <div style={progressHeaderStyle}>
                  <div className="progress-ring-wrap">
                    <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden>
                      <circle className="prg-bg" cx="30" cy="30" r="26" />
                      <circle className="prg-fill" cx="30" cy="30" r="26" style={{ strokeDashoffset: progress.offset }} />
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
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCheck(row.id); } }}
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

            {/* ── Vacancies ── */}
            <div id="vacancies">
              <div className="section-hdr">
                <span className="section-hdr-title">Подборка для тебя</span>
                <Link href="/vacancies" className="section-hdr-link">Все вакансии →</Link>
              </div>
              <div className="section-badge">На основе профиля: IT · Junior · Москва · Сохранено: {savedCounts.vacancies}</div>

              <div className="jobs-list">
                {JOBS.map((job) => (
                  <div key={job.title} className="job-card">
                    <div className="job-card-top">
                      <div className="job-card-left">
                        <div className="job-co">{job.co}</div>
                        <h3 className="job-title">{job.title}</h3>
                      </div>
                      <div className="job-salary-block"><span className="job-salary">{job.salary}</span></div>
                    </div>
                    <ul className="job-tags">
                      {job.tags.map((t) => <li key={t.text}><span className={t.cls}>{t.text}</span></li>)}
                    </ul>
                    <div className="job-card-bottom">
                      <div className="job-actions">
                        <div className="tooltip-wrap">
                          <button type="button" className="job-btn-primary">Откликнуться</button>
                          <div className="tooltip-pop">Откроет email HR-менеджера</div>
                        </div>
                        <Link href="/vacancies" className="job-btn-secondary" style={{ textDecoration: "none" }}>Подробнее</Link>
                      </div>
                      <span className="job-date">{job.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Articles ── */}
            <div id="articles">
              <div className="section-hdr">
                <span className="section-hdr-title">Сохранённые статьи</span>
                <Link href="/knowledge-base" className="section-hdr-link">В базу знаний →</Link>
              </div>
              <div className="section-badge">Сохранено статей: {savedCounts.articles}</div>

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
                        <span className="card-save" aria-hidden>🔖</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      <div
        className={`modal-overlay${modalOpen ? " open" : ""}`}
        onClick={closeModalBg}
        role="presentation"
      >
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="office-modal-title">
          <div className="modal-title" id="office-modal-title">Редактировать профиль</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="office-fn">Имя</label>
              <input className="form-input" id="office-fn" type="text" value={formFn} onChange={(e) => setFormFn(e.target.value)} placeholder="Имя" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="office-ln">Фамилия</label>
              <input className="form-input" id="office-ln" type="text" value={formLn} onChange={(e) => setFormLn(e.target.value)} placeholder="Фамилия" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="office-dir">Направление</label>
            <select className="form-select" id="office-dir" value={formDir} onChange={(e) => setFormDir(e.target.value)}>
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
              <label className="form-label" htmlFor="office-lvl">Уровень</label>
              <select className="form-select" id="office-lvl" value={formLvl} onChange={(e) => setFormLvl(e.target.value)}>
                <option>Стажёр</option>
                <option>Junior</option>
                <option>Middle</option>
                <option>Senior</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="office-fmt">Формат</label>
              <select className="form-select" id="office-fmt" value={formFmt} onChange={(e) => setFormFmt(e.target.value)}>
                <option>Не важно</option>
                <option>Гибрид</option>
                <option>Удалённо</option>
                <option>Офис</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="office-city">Город</label>
            <input className="form-input" id="office-city" type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="Город" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-save" onClick={saveProfile}>Сохранить</button>
            <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  );
}
