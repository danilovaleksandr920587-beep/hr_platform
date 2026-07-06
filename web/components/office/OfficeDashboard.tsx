"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SAVED_ITEMS_EVENT, readSavedSnapshot, syncSavedFromDb } from "@/lib/client/saved-items";
import { InlineResumeAnalyzer } from "@/components/office/InlineResumeAnalyzer";
import type { VacancyRow, ArticleRow } from "@/lib/types";
import { EXP_LABELS, FORMAT_LABELS, TYPE_LABELS } from "@/lib/vacancy-labels";

type OfficeDashboardProps = {
  userScope: string;
  email: string;
  displayName?: string | null;
  matchedVacancies: VacancyRow[];
};

function initialsFrom(name: string, surname: string, email: string) {
  const a = name.trim()[0] ?? "";
  const b = surname.trim()[0] ?? "";
  if (a || b) return (a + b).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function formatSalary(min: number | null, max: number | null) {
  if (min == null && max == null) return "Зарплата не указана";
  if (min != null && max != null)
    return `${min.toLocaleString("ru-RU")} — ${max.toLocaleString("ru-RU")} ₽`;
  if (min != null) return `от ${min.toLocaleString("ru-RU")} ₽`;
  return `до ${max!.toLocaleString("ru-RU")} ₽`;
}

const ARTICLE_VISUAL_MAP: Record<string, { cls: string; icon: string; stat: string; ctag: string; ctagLabel: string }> = {
  resume: { cls: "cv-resume", icon: "📄", stat: "CV", ctag: "ctag-resume", ctagLabel: "Резюме" },
  interview: { cls: "cv-interview", icon: "🎤", stat: "20", ctag: "ctag-interview", ctagLabel: "Интервью" },
  salary: { cls: "cv-salary", icon: "💰", stat: "₽", ctag: "ctag-salary", ctagLabel: "Зарплаты" },
};

// Maps profile direction → vacancy sphere DB key
const DIRECTION_TO_SPHERE: Record<string, string> = {
  IT: "it",
  Аналитика: "analytics",
  Финансы: "finance",
  Маркетинг: "marketing",
  Управление: "product",
  Дизайн: "design",
  QA: "it",
};

// Maps profile level → vacancy exp DB keys (allow similar levels)
const LEVEL_TO_EXP: Record<string, string[]> = {
  Стажёр: ["none", "lt1"],
  Junior: ["none", "lt1"],
  Middle: ["1-3"],
  Senior: ["gte3"],
};

// Maps profile format → vacancy format DB key
const FORMAT_TO_DB: Record<string, string | undefined> = {
  Гибрид: "hybrid",
  Удалённо: "remote",
  Офис: "office",
  "Не важно": undefined,
};

type SalaryRange = { min: number; max: number; median: number };
const SALARY_DATA: Record<string, Record<string, SalaryRange>> = {
  IT: {
    Стажёр: { min: 40000, max: 80000, median: 60000 },
    Junior: { min: 80000, max: 150000, median: 115000 },
    Middle: { min: 150000, max: 250000, median: 200000 },
    Senior: { min: 250000, max: 400000, median: 320000 },
  },
  Аналитика: {
    Стажёр: { min: 35000, max: 70000, median: 52000 },
    Junior: { min: 65000, max: 130000, median: 97000 },
    Middle: { min: 130000, max: 220000, median: 175000 },
    Senior: { min: 220000, max: 380000, median: 290000 },
  },
  Маркетинг: {
    Стажёр: { min: 28000, max: 60000, median: 44000 },
    Junior: { min: 55000, max: 100000, median: 75000 },
    Middle: { min: 100000, max: 180000, median: 140000 },
    Senior: { min: 180000, max: 300000, median: 240000 },
  },
  Дизайн: {
    Стажёр: { min: 30000, max: 65000, median: 47000 },
    Junior: { min: 65000, max: 120000, median: 90000 },
    Middle: { min: 120000, max: 200000, median: 160000 },
    Senior: { min: 200000, max: 350000, median: 270000 },
  },
  QA: {
    Стажёр: { min: 38000, max: 75000, median: 55000 },
    Junior: { min: 70000, max: 130000, median: 100000 },
    Middle: { min: 130000, max: 210000, median: 170000 },
    Senior: { min: 210000, max: 360000, median: 280000 },
  },
  Управление: {
    Стажёр: { min: 35000, max: 70000, median: 52000 },
    Junior: { min: 65000, max: 120000, median: 90000 },
    Middle: { min: 120000, max: 210000, median: 165000 },
    Senior: { min: 210000, max: 380000, median: 290000 },
  },
  Финансы: {
    Стажёр: { min: 30000, max: 65000, median: 47000 },
    Junior: { min: 60000, max: 110000, median: 82000 },
    Middle: { min: 110000, max: 190000, median: 150000 },
    Senior: { min: 190000, max: 330000, median: 260000 },
  },
};

function getSalaryData(direction: string, level: string): SalaryRange {
  return SALARY_DATA[direction]?.[level] ?? SALARY_DATA["IT"]["Junior"];
}

function fmtNum(n: number): string {
  return n.toLocaleString("ru-RU");
}

function articleVisual(row: { cat_slug: string; category: string }) {
  return (
    ARTICLE_VISUAL_MAP[row.cat_slug] ??
    ARTICLE_VISUAL_MAP[row.category] ?? {
      cls: "cv-resume",
      icon: "📄",
      stat: "·",
      ctag: "ctag-resume",
      ctagLabel: row.category,
    }
  );
}

type SectionId = "resume" | "salary" | "checklist" | "vacancies" | "articles";

function parseName(displayName?: string | null, email?: string) {
  const n = displayName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    return { firstName: parts[0] ?? "", surname: parts.slice(1).join(" ") };
  }
  return { firstName: email?.split("@")[0] ?? "", surname: "" };
}

const PROFILE_KEY = (scope: string) => `careerlab-profile:${scope}`;

export function OfficeDashboard({ userScope, email, displayName, matchedVacancies }: OfficeDashboardProps) {
  const parsed = parseName(displayName, email);

  const [profileFirstName, setProfileFirstName] = useState(parsed.firstName);
  const [profileSurname, setProfileSurname] = useState(parsed.surname);
  const [profileDirection, setProfileDirection] = useState("IT");
  const [profileLevel, setProfileLevel] = useState("Junior");
  const [profileFormat, setProfileFormat] = useState("Гибрид");
  const [profileCity, setProfileCity] = useState("Москва");

  // Load profile from DB on mount (fallback to localStorage cache)
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: { profile?: { firstName?: string; surname?: string; direction?: string; level?: string; format?: string; city?: string } | null }) => {
        const p = data.profile;
        if (p) {
          if (p.firstName) setProfileFirstName(p.firstName);
          if (p.surname) setProfileSurname(p.surname);
          if (p.direction) setProfileDirection(p.direction);
          if (p.level) setProfileLevel(p.level);
          if (p.format) setProfileFormat(p.format);
          if (p.city) setProfileCity(p.city);
        } else {
          // No DB record yet — try localStorage cache
          try {
            const raw = localStorage.getItem(PROFILE_KEY(userScope));
            if (raw) {
              const lp = JSON.parse(raw) as Record<string, string>;
              if (lp.direction) setProfileDirection(lp.direction);
              if (lp.level) setProfileLevel(lp.level);
              if (lp.format) setProfileFormat(lp.format);
              if (lp.city) setProfileCity(lp.city);
            }
          } catch {}
        }
      })
      .catch(() => {
        // Fallback to localStorage if API unavailable
        try {
          const raw = localStorage.getItem(PROFILE_KEY(userScope));
          if (raw) {
            const lp = JSON.parse(raw) as Record<string, string>;
            if (lp.direction) setProfileDirection(lp.direction);
            if (lp.level) setProfileLevel(lp.level);
            if (lp.format) setProfileFormat(lp.format);
            if (lp.city) setProfileCity(lp.city);
          }
        } catch {}
      });

    // Sync saved vacancies/articles from DB into localStorage
    void syncSavedFromDb(userScope);
  }, [userScope]);

  const displayFirstName = profileFirstName || email.split("@")[0] || "друг";
  const displayFullName = [profileFirstName, profileSurname].filter(Boolean).join(" ") || email;
  const initials = initialsFrom(profileFirstName, profileSurname, email);
  const profileBadge = `${profileDirection} · ${profileLevel}`;

  const [modalOpen, setModalOpen] = useState(false);
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

    // Persist to DB (primary source of truth)
    void fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: formFn,
        surname: formLn,
        direction: formDir,
        level: formLvl,
        format: formFmt,
        city: formCity,
      }),
    }).catch(() => {});

    // Also cache in localStorage as fallback
    try {
      localStorage.setItem(
        PROFILE_KEY(userScope),
        JSON.stringify({ direction: formDir, level: formLvl, format: formFmt, city: formCity }),
      );
    } catch {}

    setModalOpen(false);
  }

  const [loggingOut, setLoggingOut] = useState(false);
  const [resumeScore, setResumeScore] = useState<number | null>(null);
  const [activeNav, setActiveNav] = useState<SectionId>("resume");
  const [savedCounts, setSavedCounts] = useState({ vacancies: 0, articles: 0 });
  const [savedArticlesList, setSavedArticlesList] = useState<ArticleRow[]>([]);
  const [localVacancies, setLocalVacancies] = useState<VacancyRow[]>(matchedVacancies);

  const [checkRows, setCheckRows] = useState([
    { id: "1", done: false, label: "Резюме загружено и оценено", href: null as string | null, cta: null as string | null },
    { id: "2", done: false, label: "Заполнен профиль: направление и уровень", href: null, cta: null },
    { id: "3", done: false, label: "Прочитан гайд «Как написать резюме»", href: "/knowledge-base/resume", cta: "Гайд →" },
    { id: "4", done: false, label: "Подготовься к интервью — пройди тест на знание стека", href: "/knowledge-base/interview", cta: "Пройти →" },
    { id: "5", done: false, label: "Добавь GitHub или портфолио в резюме", href: "/knowledge-base/resume", cta: "Гайд →" },
    { id: "6", done: false, label: "Сохрани 5 подходящих вакансий из подборки", href: "/vacancies", cta: "Смотреть →" },
    { id: "7", done: false, label: "Изучи зарплатный рынок в своём направлении", href: "/tools/salary-calculator", cta: "Калькулятор →" },
  ]);

  useEffect(() => {
    if (resumeScore !== null) {
      setCheckRows((rows) => rows.map((r) => r.id === "1" ? { ...r, done: true } : r));
    }
  }, [resumeScore]);

  const progress = useMemo(() => {
    const done = checkRows.filter((r) => r.done).length;
    const pct = Math.round((done / checkRows.length) * 100);
    const offset = 163 * (1 - done / checkRows.length);
    return { pct, offset, done };
  }, [checkRows]);

  // Sync saved counts and fetch saved articles
  useEffect(() => {
    const syncArticles = async (slugs: string[]) => {
      if (!slugs.length) {
        setSavedArticlesList([]);
        return;
      }
      try {
        const res = await fetch("/api/articles/by-slugs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs }),
        });
        const data = (await res.json().catch(() => ({ rows: [] }))) as { rows?: ArticleRow[] };
        setSavedArticlesList(Array.isArray(data.rows) ? data.rows : []);
      } catch {
        setSavedArticlesList([]);
      }
    };

    const sync = () => {
      const snapshot = readSavedSnapshot(userScope);
      setSavedCounts({
        vacancies: snapshot.vacancies.size,
        articles: snapshot.articles.size,
      });
      void syncArticles([...snapshot.articles]);
    };
    sync();
    window.addEventListener(SAVED_ITEMS_EVENT, sync);
    return () => window.removeEventListener(SAVED_ITEMS_EVENT, sync);
  }, [userScope]);

  // Re-fetch vacancies when profile changes
  useEffect(() => {
    const sphere = DIRECTION_TO_SPHERE[profileDirection] ?? "it";
    const expKeys = LEVEL_TO_EXP[profileLevel] ?? ["none", "lt1"];
    const formatKey = FORMAT_TO_DB[profileFormat];

    const params = new URLSearchParams({ sphere, exp: expKeys.join(","), limit: "4" });
    if (formatKey) params.set("format", formatKey);

    fetch(`/api/vacancies/featured?${params}`)
      .then((r) => r.json())
      .then((data: { rows?: VacancyRow[] }) => {
        if (Array.isArray(data.rows) && data.rows.length > 0) {
          setLocalVacancies(data.rows);
        }
      })
      .catch(() => {});
  }, [profileDirection, profileLevel, profileFormat]);

  const scrollTo = useCallback((id: SectionId) => {
    setActiveNav(id);
    const el = document.getElementById(id); if (el) { const top = el.getBoundingClientRect().top + window.scrollY - 100; window.scrollTo({ top, behavior: "smooth" }); }
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
  const unboundedTitleStyle = useMemo(() => ({ fontFamily: "'Unbounded',sans-serif", fontSize: 14, fontWeight: 700, color: "var(--dark)", marginBottom: 3 }), []);
  const muted13 = useMemo(() => ({ fontSize: 13, color: "var(--muted)" }), []);

  const NAV_ITEMS: [SectionId, string, string, string | null][] = [
    ["resume", "📄", "Резюме", null],
    ["salary", "💰", "Зарплата", null],
    ["checklist", "✅", "Готовность", `${progress.pct}%`],
    ["vacancies", "🔖", "Подборка для тебя", null],
    ["articles", "📚", "Статьи", savedCounts.articles > 0 ? String(savedCounts.articles) : null],
  ];

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
                  {NAV_ITEMS.map(([id, icon, label, count]) => (
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

                  <Link href="/office/saved-vacancies" className="office-nav-link">
                    <span className="nav-icon">💾</span> Сохранённые вакансии
                    {savedCounts.vacancies > 0 && <span className="nav-count">{savedCounts.vacancies}</span>}
                  </Link>

                  <Link href="/office/applications" className="office-nav-link">
                    <span className="nav-icon">📨</span> Мои отклики
                  </Link>

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
                <div className="home-stat-num" style={statGreen}>
                  {Math.round(getSalaryData(profileDirection, profileLevel).median / 1000)}k
                </div>
                <div className="home-stat-label">Медиана зарплат · {profileDirection} {profileLevel}</div>
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
              <InlineResumeAnalyzer userScope={userScope} onScoreChange={setResumeScore} />
            </div>

            {/* ── Salary section ── */}
            <div id="salary">
              <div className="section-hdr">
                <span className="section-hdr-title">Зарплата по профилю</span>
                <Link href="/tools/salary-calculator" className="section-hdr-link">Открыть калькулятор →</Link>
              </div>

              <div className="chips" style={chipsMb}>
                <span className="chip">{profileDirection}</span>
                <span className="chip">{profileLevel}</span>
                {profileCity && <span className="chip">{profileCity}</span>}
                {profileFormat !== "Не важно" && <span className="chip">{profileFormat}</span>}
              </div>

              {(() => {
                const sal = getSalaryData(profileDirection, profileLevel);
                const roleLabel = [profileDirection, profileLevel, profileCity, profileFormat !== "Не важно" ? profileFormat : null]
                  .filter(Boolean).join(" · ");
                const rangePct = Math.round(((sal.median - sal.min) / (sal.max - sal.min)) * 100);
                const medianPct = Math.round(((sal.median - sal.min) / (sal.max - sal.min)) * 100);
                return (
                  <div className="scalc">
                    <div className="salary-hero">
                      <div className="sh-label">Диапазон зарплат</div>
                      <div className="sh-role">{roleLabel}</div>
                      <div className="sh-range">
                        <span className="sh-from">{fmtNum(sal.min)}</span>
                        <span className="sh-dash">—</span>
                        <span className="sh-to">{fmtNum(sal.max)} ₽</span>
                      </div>
                      <div className="sh-median">
                        <span style={shMedianHint}>Медиана рынка</span>
                        <span className="sh-median-val">{fmtNum(sal.median)} ₽</span>
                        <span className="sh-median-badge">Май 2025</span>
                      </div>
                    </div>

                    <div className="range-bar-card">
                      <div className="rbc-title">Распределение по рынку</div>
                      <div className="range-track">
                        <div className="range-fill" style={{ left: 0, width: `${rangePct}%` }} />
                        <div className="range-median-line" style={{ left: `${medianPct}%` }} />
                      </div>
                      <div className="range-markers">
                        <span>{fmtNum(sal.min)} ₽</span>
                        <span>{fmtNum(sal.median)} ₽</span>
                        <span>{fmtNum(sal.max)} ₽</span>
                      </div>
                    </div>

                    <div className="ai-insight">
                      <div className="ai-header">
                        <div className="ai-dot" />
                        <div className="ai-header-title">Инсайт по твоему профилю</div>
                      </div>
                      <div className="ai-text">
                        {profileFormat === "Офис"
                          ? <>Переход на гибридный или удалённый формат для {profileDirection} {profileLevel} может увеличить медиану на <strong>10–20%</strong>. Рассмотри компании с распределёнными командами.</>
                          : profileLevel === "Стажёр" || profileLevel === "Junior"
                            ? <>Добавление 2–3 профильных проектов в портфолио сдвигает оффер {profileDirection} {profileLevel} вверх на <strong>15–25%</strong> относительно медианы рынка.</>
                            : <>Специалисты уровня {profileLevel} в {profileDirection} с опытом в продуктовых компаниях зарабатывают на <strong>20–30%</strong> больше рынка. Укажи результаты в цифрах в резюме.</>
                        }
                      </div>
                    </div>

                    <div className="tips-card">
                      <div className="tips-title">Как <em>увеличить</em> зарплату</div>
                      <div className="tip-row"><span className="tip-row-num">01</span><span className="tip-row-text">Добавь портфолио или GitHub с реальными проектами — сдвигает оффер на 10–20% выше рынка</span></div>
                      <div className="tip-row"><span className="tip-row-num">02</span><span className="tip-row-text">Указывай результаты в цифрах в резюме — HR воспринимает это как опыт выше уровня</span></div>
                      <div className="tip-row"><span className="tip-row-num">03</span><span className="tip-row-text">Рассмотри продуктовые компании — они платят {profileLevel} на 15–25% больше, чем аутсорс</span></div>
                    </div>
                  </div>
                );
              })()}
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
                          {row.cta}
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
              <div className="section-badge">
                На основе профиля: {profileDirection} · {profileLevel}
                {profileCity ? ` · ${profileCity}` : ""}
                {profileFormat !== "Не важно" ? ` · ${profileFormat}` : ""}
                {" · "}Сохранено: {savedCounts.vacancies}
              </div>

              {localVacancies.length === 0 ? (
                <div className="panel" style={{ padding: 20 }}>
                  <p style={{ margin: 0 }}>Нет подходящих вакансий. <Link href="/vacancies">Смотреть все вакансии →</Link></p>
                </div>
              ) : (
                <div className="jobs-list">
                  {localVacancies.map((v) => (
                    <div key={v.slug} className="job-card">
                      <div className="job-card-top">
                        <div className="job-card-left">
                          <div className="job-co">{v.company}</div>
                          <h3 className="job-title">
                            <Link href={`/vacancies/${v.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                              {v.title}
                            </Link>
                          </h3>
                        </div>
                        <div className="job-salary-block">
                          <span className={`job-salary${v.salary_min == null && v.salary_max == null ? " na" : ""}`}>{formatSalary(v.salary_min, v.salary_max)}</span>
                        </div>
                      </div>
                      <ul className="job-tags">
                        {v.exp && <li><span className="jtag jtag-exp">{EXP_LABELS[v.exp] ?? v.exp}</span></li>}
                        {v.format && <li><span className="jtag jtag-format">{FORMAT_LABELS[v.format] ?? v.format}</span></li>}
                        {v.type && <li><span className="jtag jtag-format">{TYPE_LABELS[v.type] ?? v.type}</span></li>}
                        {v.city && <li><span className="jtag jtag-format">{v.city}</span></li>}
                      </ul>
                      <div className="job-card-bottom">
                        <div className="job-actions">
                          {v.apply_url ? (
                            <a href={v.apply_url} className="job-btn-primary" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                              Откликнуться
                            </a>
                          ) : (
                            <Link href={`/vacancies/${v.slug}`} className="job-btn-primary" style={{ textDecoration: "none" }}>
                              Откликнуться
                            </Link>
                          )}
                          <Link href={`/vacancies/${v.slug}`} className="job-btn-secondary" style={{ textDecoration: "none" }}>
                            Подробнее
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Articles ── */}
            <div id="articles">
              <div className="section-hdr">
                <span className="section-hdr-title">Сохранённые статьи</span>
                <Link href="/knowledge-base" className="section-hdr-link">В базу знаний →</Link>
              </div>
              <div className="section-badge">Сохранено статей: {savedCounts.articles}</div>

              {savedArticlesList.length === 0 ? (
                <div className="panel" style={{ padding: 20 }}>
                  <p style={{ margin: 0 }}>
                    Нет сохранённых статей.{" "}
                    <Link href="/knowledge-base">Перейти в базу знаний →</Link>
                  </p>
                </div>
              ) : (
                <div className="articles-grid">
                  {savedArticlesList.map((a) => {
                    const v = articleVisual(a);
                    return (
                      <Link key={a.slug} href={`/knowledge-base/${a.slug}`} className="article-card" style={{ textDecoration: "none", color: "inherit" }}>
                        <div className={`card-visual ${v.cls}`}>
                          <span className="card-visual-icon">{v.icon}</span>
                          <div className="card-visual-preview">
                            <div className="cvp-line cvp-line-long" />
                            <div className="cvp-line cvp-line-mid" />
                            <div className="cvp-line cvp-line-short" />
                          </div>
                          <span className="card-visual-stat">{v.stat}</span>
                        </div>
                        <div className="card-body">
                          <div className="card-tags">
                            <span className={`ctag ${v.ctag}`}>{v.ctagLabel}</span>
                            <span className="ctag ctag-time">{a.read_time} мин</span>
                          </div>
                          <h3 className="card-title">{a.title}</h3>
                          <div className="card-footer">
                            <span className="card-read-btn">Читать</span>
                            <span className="card-save" aria-hidden>🔖</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
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
            <input className="form-input" id="office-city" list="office-cities-list" value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="Начни вводить город…" autoComplete="off" />
            <datalist id="office-cities-list">
              {["Москва","Санкт-Петербург","Екатеринбург","Новосибирск","Казань","Нижний Новгород","Красноярск","Челябинск","Самара","Уфа","Ростов-на-Дону","Омск","Пермь","Воронеж","Волгоград","Краснодар","Удалённо"].map(c => <option key={c} value={c} />)}
            </datalist>
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
