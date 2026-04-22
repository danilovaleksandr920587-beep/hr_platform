"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Chart as ChartInstance } from "chart.js/auto";
import {
  COMPANIES,
  GROWTH_DATA,
  INDUSTRIES,
  INDUSTRY_DATA,
  CITY_DATA,
  CITY_LABELS,
  UNI_DATA,
  EDUCATION_BAR,
  EDUCATION_GROWTH,
  EDUCATION_LABELS,
} from "./researchSalaryData";

type IndustryLevel = "internship" | "junior" | "middle" | "senior";
type GrowthTrack = "it" | "ds" | "cons" | "fin";
type CityLevel = "intern" | "junior" | "middle";
type UniField = "it" | "econ" | "eng";
type EduFilter = "all" | "college" | "bachelor" | "master";

const navTabs = [
  ["conclusions", "Выводы"],
  ["industries", "По отраслям"],
  ["growth", "Карьерный рост"],
  ["cities", "По городам"],
  ["universities", "По вузам"],
  ["companies", "Компании"],
  ["education", "Образование"],
  ["factors", "Факторы"],
] as const;

// Radar data for offer quality comparison
const RADAR_LABELS = ["Оклад", "Рост", "Менторство", "Гибкость", "Культура", "Технологии"];
const RADAR_TOP_IT = [90, 85, 80, 75, 80, 95];
const RADAR_MARKET  = [65, 60, 55, 60, 60, 60];

export function ResearchSalaryDashboard() {
  const [industryLevel, setIndustryLevel] = useState<IndustryLevel>("internship");
  const [growthTrack, setGrowthTrack] = useState<GrowthTrack>("it");
  const [cityLevel, setCityLevel] = useState<CityLevel>("intern");
  const [uniField, setUniField] = useState<UniField>("it");
  const [activeSection, setActiveSection] = useState("conclusions");
  const [eduFilter, setEduFilter] = useState<EduFilter>("all");

  const indRef    = useRef<HTMLCanvasElement>(null);
  const growthRef = useRef<HTMLCanvasElement>(null);
  const eduBarRef = useRef<HTMLCanvasElement>(null);
  const eduLineRef= useRef<HTMLCanvasElement>(null);
  const radarRef  = useRef<HTMLCanvasElement>(null);

  const charts = useRef<Record<string, ChartInstance | null>>({});

  const growthData  = GROWTH_DATA[growthTrack];
  const cityValues  = CITY_DATA[cityLevel];
  const uniData     = UNI_DATA[uniField];
  const cityMax     = Math.max(...cityValues);
  const uniMax      = Math.max(...uniData.sal);

  // Scroll-spy for sticky nav
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.22, rootMargin: "-100px 0px -45% 0px" },
    );
    navTabs.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Industry + Growth charts
  useEffect(() => {
    let mounted = true;
    const render = async () => {
      const { Chart } = await import("chart.js/auto");
      if (!mounted) return;

      Chart.defaults.font.family = "'Golos Text', system-ui, sans-serif";
      Chart.defaults.font.size = 12;
      Chart.defaults.color = "#9aa08a";

      const LIME    = "#c9f135";
      const INK     = "#2d3020";
      const BG_LINE = "rgba(0,0,0,.05)";

      // Industry chart
      const indCtx = indRef.current?.getContext("2d");
      if (indCtx) {
        charts.current.ind?.destroy();
        const d = INDUSTRY_DATA[industryLevel];
        charts.current.ind = new Chart(indCtx, {
          type: "bar",
          data: {
            labels: INDUSTRIES,
            datasets: [
              {
                label: "Медиана",
                data: d.med,
                backgroundColor: INK,
                borderRadius: 6,
                barThickness: 16,
              },
              {
                label: "Топ 25%",
                data: d.p75,
                backgroundColor: "rgba(201,241,53,.75)",
                borderRadius: 6,
                barThickness: 16,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: "#7a7d70", boxWidth: 12, boxHeight: 12 } },
              tooltip: {
                callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} тыс. ₽` },
              },
            },
            scales: {
              x: {
                ticks: { color: "#9aa08a", maxRotation: 38, font: { size: 11 } },
                grid: { display: false },
                border: { display: false },
              },
              y: {
                ticks: { color: "#9aa08a", callback: (v) => `${v} тыс.` },
                grid: { color: BG_LINE },
                border: { display: false },
              },
            },
          },
        });
      }

      // Growth chart
      const growthCtx = growthRef.current?.getContext("2d");
      if (growthCtx) {
        charts.current.growth?.destroy();
        charts.current.growth = new Chart(growthCtx, {
          type: "line",
          data: {
            labels: growthData.yrs,
            datasets: [{
              label: "Зарплата",
              data: growthData.sal,
              borderColor: LIME,
              backgroundColor: "rgba(201,241,53,.1)",
              pointBackgroundColor: LIME,
              pointBorderColor: "#1a1d10",
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8,
              fill: true,
              tension: 0.35,
              borderWidth: 3,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: { label: (ctx) => ` ${ctx.parsed.y} тыс. ₽` },
              },
            },
            scales: {
              x: {
                ticks: { color: "rgba(255,255,255,.35)", font: { size: 10 }, maxRotation: 30 },
                grid: { display: false },
                border: { display: false },
              },
              y: {
                ticks: { color: "rgba(255,255,255,.35)", callback: (v) => `${v} тыс.` },
                grid: { color: "rgba(255,255,255,.07)" },
                border: { display: false },
              },
            },
          },
        });
      }
    };

    render();
    return () => {
      mounted = false;
      charts.current.ind?.destroy();
      charts.current.growth?.destroy();
    };
  }, [industryLevel, growthData]);

  // Education charts (with filter)
  useEffect(() => {
    let mounted = true;
    const render = async () => {
      const { Chart } = await import("chart.js/auto");
      if (!mounted) return;

      const INK  = "#2d3020";
      const LIME = "#c9f135";

      const allBarDatasets = [
        { key: "college",  label: "Колледж",      data: EDUCATION_BAR.college,  backgroundColor: "rgba(45,48,32,.25)", borderRadius: 5, barThickness: 16 },
        { key: "bachelor", label: "Бакалавриат",  data: EDUCATION_BAR.bachelor, backgroundColor: INK,                 borderRadius: 5, barThickness: 16 },
        { key: "master",   label: "Магистратура", data: EDUCATION_BAR.master,   backgroundColor: LIME,                borderRadius: 5, barThickness: 16 },
      ] as const;

      const allLineDatasets = [
        { key: "college",  label: "Колледж",      data: EDUCATION_GROWTH.college,  borderColor: "#9aa08a",         backgroundColor: "transparent",          tension: 0.35, borderWidth: 2,   pointRadius: 4 },
        { key: "bachelor", label: "Бакалавриат",  data: EDUCATION_GROWTH.bachelor, borderColor: INK,               backgroundColor: "transparent",          tension: 0.35, borderWidth: 2.5, pointRadius: 4 },
        { key: "master",   label: "Магистратура", data: EDUCATION_GROWTH.master,   borderColor: LIME, backgroundColor: "rgba(201,241,53,.07)", fill: true, tension: 0.35, borderWidth: 3,   pointRadius: 5 },
      ] as const;

      const barDatasets = eduFilter === "all"
        ? allBarDatasets
        : allBarDatasets.filter((d) => d.key === eduFilter);

      const lineDatasets = eduFilter === "all"
        ? allLineDatasets
        : allLineDatasets.filter((d) => d.key === eduFilter);

      const eduBarCtx = eduBarRef.current?.getContext("2d");
      if (eduBarCtx) {
        charts.current.eduBar?.destroy();
        charts.current.eduBar = new Chart(eduBarCtx, {
          type: "bar",
          data: {
            labels: EDUCATION_LABELS,
            datasets: barDatasets.map((d) => ({ ...d })),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} тыс. ₽` } },
            },
            scales: {
              x: { grid: { display: false }, border: { display: false } },
              y: { ticks: { callback: (v) => `${v} тыс.` }, border: { display: false } },
            },
          },
        });
      }

      const eduLineCtx = eduLineRef.current?.getContext("2d");
      if (eduLineCtx) {
        charts.current.eduLine?.destroy();
        charts.current.eduLine = new Chart(eduLineCtx, {
          type: "line",
          data: {
            labels: ["1 год", "2 года", "3 года", "4 года", "5 лет"],
            datasets: lineDatasets.map((d) => ({ ...d })),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} тыс. ₽` } },
            },
            scales: {
              x: { grid: { display: false }, border: { display: false } },
              y: { ticks: { callback: (v) => `${v} тыс.` }, border: { display: false } },
            },
          },
        });
      }
    };

    render();
    return () => {
      mounted = false;
      charts.current.eduBar?.destroy();
      charts.current.eduLine?.destroy();
    };
  }, [eduFilter]);

  // Radar chart (static, one-time)
  useEffect(() => {
    let mounted = true;
    const render = async () => {
      const { Chart } = await import("chart.js/auto");
      if (!mounted) return;

      const LIME = "#c9f135";

      const radarCtx = radarRef.current?.getContext("2d");
      if (radarCtx) {
        charts.current.radar?.destroy();
        charts.current.radar = new Chart(radarCtx, {
          type: "radar",
          data: {
            labels: RADAR_LABELS,
            datasets: [
              {
                label: "Топ IT",
                data: RADAR_TOP_IT,
                borderColor: LIME,
                backgroundColor: "rgba(201,241,53,.12)",
                pointBackgroundColor: LIME,
                pointBorderColor: "#1a1d10",
                borderWidth: 2.5,
                pointRadius: 5,
              },
              {
                label: "Средний рынок",
                data: RADAR_MARKET,
                borderColor: "rgba(255,255,255,.4)",
                backgroundColor: "rgba(255,255,255,.05)",
                pointBackgroundColor: "rgba(255,255,255,.5)",
                pointBorderColor: "#1a1d10",
                borderWidth: 1.5,
                pointRadius: 4,
                borderDash: [4, 3],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: "rgba(255,255,255,.55)", boxWidth: 12, boxHeight: 12 },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.r} / 100`,
                },
              },
            },
            scales: {
              r: {
                min: 0,
                max: 100,
                ticks: { display: false, stepSize: 25 },
                grid: { color: "rgba(255,255,255,.1)" },
                pointLabels: { color: "rgba(255,255,255,.7)", font: { size: 11 } },
                angleLines: { color: "rgba(255,255,255,.1)" },
              },
            },
          },
        });
      }
    };

    render();
    return () => {
      mounted = false;
      charts.current.radar?.destroy();
    };
  }, []);

  const companyRows = useMemo(
    () => COMPANIES.map((company, index) => ({ ...company, index: index + 1 })),
    [],
  );

  return (
    <main className="rsd">

      {/* ── Header ── */}
      <header className="page-header">
        <div className="wrap">
          <p className="eyebrow">CareerLab · Исследования · 2026</p>
          <h1 className="ph-title">Зарплаты студентов<br />и молодых специалистов</h1>
          <p className="ph-sub">Аналитика по 11 отраслям, 10 городам и 3 типам образования. Данные hh.ru, SuperJob, Habr Career — 2025–2026</p>
        </div>
      </header>

      {/* ── KPI strip ── */}
      <div className="kpi-bar">
        <div className="wrap kpi-list">
          <div className="kpi-item"><span className="kpi-n">65 тыс. ₽</span><span className="kpi-l">медиана стажёра</span></div>
          <div className="kpi-item"><span className="kpi-n">95 тыс. ₽</span><span className="kpi-l">медиана junior</span></div>
          <div className="kpi-item"><span className="kpi-n">+47%</span><span className="kpi-l">рост IT за 2 года</span></div>
          <div className="kpi-item"><span className="kpi-n">в 3.2 раза</span><span className="kpi-l">Москва vs регионы</span></div>
          <div className="kpi-item"><span className="kpi-n">+30%</span><span className="kpi-l">надбавка топ-вуза</span></div>
          <div className="kpi-item"><span className="kpi-n">5 лет</span><span className="kpi-l">до 300+ тыс. ₽ в IT</span></div>
        </div>
      </div>

      {/* ── Sticky nav ── */}
      <nav className="site-nav">
        <div className="wrap nav-list">
          {navTabs.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={`ntab${activeSection === id ? " on" : ""}`}>
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* ══ 1. Ключевые выводы ══════════════════════════════════ */}
      <section id="conclusions" className="sec sec--white">
        <div className="wrap">
          <p className="eyebrow">Ключевые выводы</p>
          <h2 className="t-title">Что нужно знать каждому<br />начинающему специалисту</h2>
          <p className="sec-lede">Шесть главных инсайтов из анализа 85 000 вакансий и зарплатных отчётов 2025–2026</p>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-num">в 2.8 раза</div>
              <p>больше зарабатывают junior в IT, чем в гуманитарных направлениях</p>
            </div>
            <div className="summary-card">
              <div className="summary-num">в 3.2 раза</div>
              <p>выше стартовые зарплаты стажёров в Москве против регионов</p>
            </div>
            <div className="summary-card">
              <div className="summary-num">+30%</div>
              <p>надбавка выпускников топ-вузов (МФТИ, ВШЭ) к среднему рынку</p>
            </div>
            <div className="summary-card">
              <div className="summary-num">5 лет</div>
              <p>до уровня Senior в IT — и зарплаты 300+ тыс. ₽/мес</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 2. Зарплаты по отраслям ═════════════════════════════ */}
      <section id="industries" className="sec sec--bg">
        <div className="wrap">
          <p className="eyebrow">Сравнение отраслей</p>
          <h2 className="t-title">IT платит в 2.8 раза больше<br />гуманитарных направлений</h2>
          <p className="sec-lede">Медиана и порог Топ 25% по каждой отрасли. Тыс. ₽/мес.</p>
          <div className="pills">
            {(["internship", "junior", "middle", "senior"] as IndustryLevel[]).map((level) => (
              <button
                key={level}
                className={`pill${industryLevel === level ? " on" : ""}`}
                onClick={() => setIndustryLevel(level)}
              >
                {level === "internship" ? "Стажёр" : level === "junior" ? "Junior" : level === "middle" ? "Middle" : "Senior"}
              </button>
            ))}
          </div>
          <div className="card chart-box">
            <canvas ref={indRef} />
          </div>
          <div className="insight-box">
            <div className="insight-box-label">Вывод</div>
            <p>
              IT-разработка и Data Science — самые высокооплачиваемые отрасли на старте.{" "}
              <strong>Консалтинг Big3</strong> держит высокую планку за счёт аналитических задач с первого дня.
              Разрыв между лидером (IT, 65 тыс.) и аутсайдером (медицина, 20 тыс.) у стажёров —{" "}
              <strong>в 3.25 раза</strong>. Переключиться в смежное IT-направление до выпуска важнее,
              чем ждать «правильной» специальности по диплому.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 3. Карьерный рост ═══════════════════════════════════ */}
      <section id="growth" className="sec sec--dark">
        <div className="wrap">
          <p className="eyebrow">Карьерные траектории</p>
          <h2 className="t-title">Рост зарплаты за 8 лет</h2>
          <p className="sec-lede" style={{ color: "rgba(255,255,255,.45)" }}>
            Медианная траектория по направлению. Тыс. ₽/мес, без учёта бонусов и RSU.
          </p>
          <div className="pills">
            {(["it", "ds", "cons", "fin"] as GrowthTrack[]).map((track) => (
              <button
                key={track}
                className={`pill${growthTrack === track ? " on" : ""}`}
                onClick={() => setGrowthTrack(track)}
              >
                {track === "it" ? "IT-разработка" : track === "ds" ? "Data Science" : track === "cons" ? "Консалтинг" : "Финансы"}
              </button>
            ))}
          </div>
          <div className="card card-dark chart-box">
            <canvas ref={growthRef} />
          </div>
          <div className="journey">
            {growthData.roles.map((role, i) => (
              <div key={role + i} className="jstep">
                <div className="jstep-role">{role}</div>
                <div className="jstep-sal">{growthData.sal[i]} тыс.</div>
              </div>
            ))}
          </div>
          <div className="insight-box insight-box--dark">
            <div className="insight-box-label">Вывод</div>
            <p>
              Первые 3 года дают самый высокий процентный прирост: стажёр → Middle в IT —{" "}
              <strong>+140%</strong>. Консалтинг даёт максимум на горизонте 8 лет (Partner 600 тыс.),
              но требует управленческой траектории. IT даёт гибкость: перейти в DS или продукт
              можно без потери в зарплате.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 4. Зарплаты по городам ══════════════════════════════ */}
      <section id="cities" className="sec sec--white">
        <div className="wrap">
          <p className="eyebrow">Географическая аналитика</p>
          <h2 className="t-title">Распределение зарплат по типу<br />города и формату офиса</h2>
          <p className="sec-lede">
            Удалённый формат с московским офисом даёт +40–60% к локальному рынку без переезда.
          </p>
          <div className="pills">
            {(["intern", "junior", "middle"] as CityLevel[]).map((level) => (
              <button
                key={level}
                className={`pill${cityLevel === level ? " on" : ""}`}
                onClick={() => setCityLevel(level)}
              >
                {level === "intern" ? "Стажёр" : level === "junior" ? "Junior" : "Middle"}
              </button>
            ))}
          </div>
          <div className="g2 cities-g2">
            {/* Left: bar list */}
            <div className="blist">
              {CITY_LABELS.map((name, i) => (
                <div key={name} className="brow">
                  <div className="brow-top">
                    <span>{name}</span>
                    <span className="brow-val">{cityValues[i]} тыс. ₽</span>
                  </div>
                  <div className="btrack">
                    <div className="bfill" style={{ width: `${Math.round((cityValues[i] / cityMax) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Right: text insights */}
            <div className="city-insights-col">
              <div className="ci-card">
                <div className="ci-val">×2.5</div>
                <div className="ci-title">Москва vs малые города</div>
                <p className="ci-text">
                  Зарплата стажёра в Москве (70 тыс.) против регионов (28 тыс.) — разрыв в 2.5 раза.
                  У junior-специалистов разрыв сохраняется: 105 тыс. против 40 тыс.
                </p>
              </div>
              <div className="ci-card">
                <div className="ci-val" style={{ color: "#2d3020" }}>+60%</div>
                <div className="ci-title">Удалёнка с московским офисом</div>
                <p className="ci-text">
                  Московский работодатель при удалённом найме платит 60–80% московской ставки —
                  это в 1.5–2 раза выше локального рынка регионального города.
                </p>
              </div>
              <div className="ci-card">
                <div className="ci-val" style={{ color: "#7a7d70" }}>+32%</div>
                <div className="ci-title">Новосибирск опережает остальные регионы</div>
                <p className="ci-text">
                  IT-кластер Новосибирска (45 тыс. стажёр) опережает средний уровень
                  региональных городов (28–38 тыс.) на 32–60%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 5. Влияние вуза ═════════════════════════════════════ */}
      <section id="universities" className="sec sec--bg">
        <div className="wrap">
          <p className="eyebrow">Аналитика по вузам</p>
          <h2 className="t-title">Выпускники МФТИ получают<br />в 1.8 раза больше среднего вуза</h2>
          <p className="sec-lede">Медианная зарплата junior по вузу и направлению. Тыс. ₽/мес.</p>
          <div className="pills">
            {(["it", "econ", "eng"] as UniField[]).map((field) => (
              <button
                key={field}
                className={`pill${uniField === field ? " on" : ""}`}
                onClick={() => setUniField(field)}
              >
                {field === "it" ? "IT-специальности" : field === "econ" ? "Экономика / Финансы" : "Инженерия"}
              </button>
            ))}
          </div>
          <div className="card blist">
            {uniData.nm.map((name, i) => (
              <div key={name} className="brow">
                <div className="brow-top">
                  <span>{name}</span>
                  <span className="brow-val">{uniData.sal[i]} тыс. ₽</span>
                </div>
                <div className="btrack">
                  <div className="bfill" style={{ width: `${Math.round((uniData.sal[i] / uniMax) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="insight-box" style={{ marginTop: 20 }}>
            <div className="insight-box-label">Вывод</div>
            <p>
              Разрыв между МФТИ (330 тыс.) и «остальными вузами» (185 тыс.) — <strong>+78%</strong>.
              Но важно: это медиана для уже состоявшихся специалистов. На старте влияние вуза
              сокращается к 3–5 годам опыта — тогда решают навыки и портфолио, не бренд диплома.
              Сильный проект > сильный вуз через 2–3 года работы.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 6. Компании ═════════════════════════════════════════ */}
      <section id="companies" className="sec sec--white">
        <div className="wrap">
          <p className="eyebrow">Рейтинг работодателей</p>
          <h2 className="t-title">McKinsey и Яндекс традиционно лидируют<br />по зарплатам стажёров</h2>
          <p className="sec-lede">
            Крупнейшие работодатели для начинающих специалистов. Топ-3 выделены — у них наиболее
            высокие стажировочные зарплаты и сильный «бренд» в резюме.
          </p>
          <div className="g2 companies-g2">
            <div className="card">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Компания</th>
                    <th>Стажёр</th>
                    <th>Junior</th>
                    <th>Тип</th>
                  </tr>
                </thead>
                <tbody>
                  {companyRows.map((row) => (
                    <tr key={row.n} className={row.index <= 3 ? "top3" : ""}>
                      <td>{row.index}</td>
                      <td>{row.n}</td>
                      <td className="sal-cell">{row.s}</td>
                      <td className="sal-cell">{row.j}</td>
                      <td>{row.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right: insights */}
            <div className="company-insights-col">
              <div className="ci-card">
                <div className="ci-val">×2.4</div>
                <div className="ci-title">McKinsey / Яндекс vs нижняя часть рейтинга</div>
                <p className="ci-text">
                  Разрыв в стажировочной зарплате между топом (130 тыс.) и аутсайдерами
                  рейтинга — в 2.4 раза. Помимо денег: строчка McKinsey или Яндекс в резюме
                  открывает следующие офферы на уровень выше.
                </p>
              </div>
              <div className="ci-card">
                <div className="ci-title">Консалтинг vs IT</div>
                <p className="ci-text">
                  McKinsey/BCG платят сопоставимо с Яндексом (130 тыс.), но карьера
                  развивается иначе: быстрее к менеджерской роли, медленнее к глубокой
                  технической экспертизе. Выбирайте исходя из цели, а не зарплаты стажировки.
                </p>
              </div>
              <div className="ci-card">
                <div className="ci-title">Конкурс в топ-3</div>
                <p className="ci-text">
                  15–40 кандидатов на место в McKinsey, Яндекс, T-Технологии. Для
                  попадания нужны: решённые кейсы / Pet-проекты, рекомендации и
                  ранний старт (не позже 3 курса).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 7. Образование ══════════════════════════════════════ */}
      <section id="education" className="sec sec--bg">
        <div className="wrap">
          <p className="eyebrow">Влияние уровня образования</p>
          <h2 className="t-title">Магистратура даёт +31%<br />к зарплате relative бакалавриата</h2>
          <p className="sec-lede">
            Зарплаты по направлениям и динамика роста по уровню образования. Тыс. ₽/мес.
          </p>
          <div className="pills">
            {(["all", "college", "bachelor", "master"] as EduFilter[]).map((f) => (
              <button
                key={f}
                className={`pill${eduFilter === f ? " on" : ""}`}
                onClick={() => setEduFilter(f)}
              >
                {f === "all" ? "Все уровни" : f === "college" ? "Колледж" : f === "bachelor" ? "Бакалавриат" : "Магистратура"}
              </button>
            ))}
          </div>
          <div className="g2">
            <div className="card chart-box"><canvas ref={eduBarRef} /></div>
            <div className="card chart-box"><canvas ref={eduLineRef} /></div>
          </div>
          <div className="insight-box" style={{ marginTop: 20 }}>
            <div className="insight-box-label">Вывод</div>
            <p>
              Магистратура даёт +31% к стартовой зарплате в IT (85 vs 65 тыс.) и увеличивает
              разрыв со временем: к 5 годам опыта разница достигает <strong>+37%</strong> (195 vs 142 тыс.).
              Но колледж + сильное портфолио выигрывает у слабого бакалавриата — практика
              решает больше, чем название степени.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 8. Факторы влияния ══════════════════════════════════ */}
      <section id="factors" className="sec sec--dark">
        <div className="wrap">
          <p className="eyebrow">Качество оффера</p>
          <h2 className="t-title">Оффер — это больше, чем зарплата:<br />шесть параметров сравнения</h2>
          <p className="sec-lede" style={{ color: "rgba(255,255,255,.45)" }}>
            Оценки 0–100 — процентильный рейтинг по рынку. 100 = лучший результат среди всех работодателей.
          </p>
          <div className="g2">
            <div className="card card-dark chart-box">
              <canvas ref={radarRef} />
            </div>
            <div className="factor-grid">
              <div className="ftag">
                <div className="ftag-label">Оклад</div>
                <div className="ftag-val">+38%</div>
                <div className="ftag-desc">разница в окладе между топ-IT и средним рынком для junior</div>
              </div>
              <div className="ftag">
                <div className="ftag-label">Технологии</div>
                <div className="ftag-val">95 vs 60</div>
                <div className="ftag-desc">Яндекс и VK vs средний рынок — максимальный разрыв именно здесь</div>
              </div>
              <div className="ftag">
                <div className="ftag-label">Рост карьеры</div>
                <div className="ftag-val">85 vs 60</div>
                <div className="ftag-desc">быстрее всего растут в IT и консалтинге, медленнее — в госсекторе</div>
              </div>
              <div className="ftag">
                <div className="ftag-label">Менторство</div>
                <div className="ftag-val">Топ: 80 / 100</div>
                <div className="ftag-desc">консалтинг структурированнее, IT быстрее — спрашивайте про onboarding</div>
              </div>
              <div className="ftag">
                <div className="ftag-label">Гибкость</div>
                <div className="ftag-val">+15–30%</div>
                <div className="ftag-desc">реальная стоимость удалёнки с учётом транспорта и времени</div>
              </div>
              <div className="ftag">
                <div className="ftag-label">Культура</div>
                <div className="ftag-val">80 vs 60</div>
                <div className="ftag-desc">разрыв между лидерами и средним рынком — ощущается через полгода</div>
              </div>
            </div>
          </div>
          <p className="radar-note">
            Оценки — процентильный рейтинг относительно всех работодателей рынка (0 = минимум, 100 = лучший на рынке)
          </p>

          {/* Recommendations */}
          <div className="reco-grid">
            <div className="reco-card">
              <div className="reco-step">1</div>
              <div className="reco-title">Начните стажировку на 2–3 курсе, не после диплома</div>
              <p className="reco-body">
                Выпускники с опытом стажировки в крупном IT до диплома закрывают первый оффер
                в среднем на 38 тыс. ₽ выше тех, кто начинал искать работу после защиты.
              </p>
              <span className="reco-stat">+38 тыс. ₽ к первому офферу</span>
            </div>
            <div className="reco-card">
              <div className="reco-step">2</div>
              <div className="reco-title">Развивайте T-shaped профиль: глубина + смежные навыки</div>
              <p className="reco-body">
                Кандидаты с основной специализацией плюс базовыми знаниями в аналитике или продукте
                нанимаются в 1.7 раза быстрее и получают офферы на 15–25% выше.
              </p>
              <span className="reco-stat">Найм в 1.7× быстрее</span>
            </div>
            <div className="reco-card">
              <div className="reco-step">3</div>
              <div className="reco-title">Называйте зарплатные ожидания первым — с обоснованием</div>
              <p className="reco-body">
                68% junior-специалистов, назвавших ожидания выше минимума диапазона и
                обосновавших это данными, получили оффер не ниже названной суммы.
              </p>
              <span className="reco-stat">68% получают ≥ своей цифры</span>
            </div>
            <div className="reco-card">
              <div className="reco-step">4</div>
              <div className="reco-title">Рассмотрите удалёнку с московским работодателем</div>
              <p className="reco-body">
                Московский оффер удалённо даёт +50–88% к региональной зарплате без переезда.
                42% компаний из топ-100 IT сохранили удалённый найм на постоянной основе.
              </p>
              <span className="reco-stat">+50–88% к региональной зарплате</span>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
