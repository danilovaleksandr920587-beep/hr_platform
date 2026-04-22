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

const navTabs = [
  ["conclusions", "💡", "Выводы"],
  ["industries", "🏭", "По отраслям"],
  ["growth", "📈", "Карьерный рост"],
  ["cities", "🏙️", "По городам"],
  ["universities", "🎓", "По вузам"],
  ["companies", "🏢", "Компании"],
  ["education", "📚", "Образование"],
  ["factors", "🔬", "Факторы"],
] as const;

export function ResearchSalaryDashboard() {
  const [industryLevel, setIndustryLevel] = useState<IndustryLevel>("internship");
  const [growthTrack, setGrowthTrack] = useState<GrowthTrack>("it");
  const [cityLevel, setCityLevel] = useState<CityLevel>("intern");
  const [uniField, setUniField] = useState<UniField>("it");
  const [activeSection, setActiveSection] = useState("conclusions");

  const indRef = useRef<HTMLCanvasElement>(null);
  const growthRef = useRef<HTMLCanvasElement>(null);
  const cityRef = useRef<HTMLCanvasElement>(null);
  const doughnutRef = useRef<HTMLCanvasElement>(null);
  const eduBarRef = useRef<HTMLCanvasElement>(null);
  const eduLineRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);

  const charts = useRef<Record<string, ChartInstance | null>>({});

  const growthData = GROWTH_DATA[growthTrack];
  const cityValues = CITY_DATA[cityLevel];
  const uniData = UNI_DATA[uniField];
  const cityMax = Math.max(...cityValues);
  const uniMax = Math.max(...uniData.sal);

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

  useEffect(() => {
    let mounted = true;

    const render = async () => {
      const { Chart } = await import("chart.js/auto");
      if (!mounted) return;

      Chart.defaults.font.family = "'Golos Text', system-ui, sans-serif";
      Chart.defaults.font.size = 12;
      Chart.defaults.color = "#9aa08a";

      const LIME = "#c9f135";
      const INK = "#2d3020";
      const BG_LINE = "rgba(0,0,0,.05)";

      const indCtx = indRef.current?.getContext("2d");
      if (indCtx) {
        charts.current.ind?.destroy();
        const d = INDUSTRY_DATA[industryLevel];
        charts.current.ind = new Chart(indCtx, {
          type: "bar",
          data: {
            labels: INDUSTRIES,
            datasets: [
              { label: "Медиана", data: d.med, backgroundColor: INK, borderRadius: 6, barThickness: 16 },
              { label: "75-й перцентиль", data: d.p75, backgroundColor: "rgba(201,241,53,.75)", borderRadius: 6, barThickness: 16 },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: "#7a7d70", boxWidth: 12, boxHeight: 12 } } },
            scales: {
              x: { ticks: { color: "#9aa08a", maxRotation: 38, font: { size: 11 } }, grid: { display: false }, border: { display: false } },
              y: { ticks: { color: "#9aa08a", callback: (v) => `${v} т₽` }, grid: { color: BG_LINE }, border: { display: false } },
            },
          },
        });
      }

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
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: "rgba(255,255,255,.35)", font: { size: 10 } }, grid: { display: false }, border: { display: false } },
              y: { ticks: { color: "rgba(255,255,255,.35)", callback: (v) => `${v} т₽` }, grid: { color: "rgba(255,255,255,.07)" }, border: { display: false } },
            },
          },
        });
      }

      const cityCtx = cityRef.current?.getContext("2d");
      if (cityCtx) {
        charts.current.city?.destroy();
        charts.current.city = new Chart(cityCtx, {
          type: "bar",
          data: {
            labels: CITY_LABELS,
            datasets: [{ data: cityValues, backgroundColor: cityValues.map((_, i) => (i === 0 ? LIME : INK)), borderRadius: 5, barThickness: 14 }],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: "#9aa08a", callback: (v) => `${v} т₽` }, grid: { color: BG_LINE }, border: { display: false } },
              y: { ticks: { color: "#7a7d70", font: { size: 11 } }, grid: { display: false }, border: { display: false } },
            },
          },
        });
      }

      const doughnutCtx = doughnutRef.current?.getContext("2d");
      if (doughnutCtx) {
        charts.current.doughnut?.destroy();
        charts.current.doughnut = new Chart(doughnutCtx, {
          type: "doughnut",
          data: {
            labels: ["IT-компании", "Консалтинг", "Банки / финансы", "Промышленность", "Другие"],
            datasets: [{ data: [38, 18, 22, 12, 10], backgroundColor: [INK, LIME, "#6b7a5a", "#9aa08a", "#d2d5c8"], borderColor: "#fff", borderWidth: 3 }],
          },
          options: { responsive: true, maintainAspectRatio: false, cutout: "60%" },
        });
      }

      const eduBarCtx = eduBarRef.current?.getContext("2d");
      if (eduBarCtx) {
        charts.current.eduBar?.destroy();
        charts.current.eduBar = new Chart(eduBarCtx, {
          type: "bar",
          data: {
            labels: EDUCATION_LABELS,
            datasets: [
              { label: "Колледж", data: EDUCATION_BAR.college, backgroundColor: "rgba(45,48,32,.25)", borderRadius: 5, barThickness: 16 },
              { label: "Бакалавриат", data: EDUCATION_BAR.bachelor, backgroundColor: INK, borderRadius: 5, barThickness: 16 },
              { label: "Магистратура", data: EDUCATION_BAR.master, backgroundColor: LIME, borderRadius: 5, barThickness: 16 },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, border: { display: false } }, y: { border: { display: false } } } },
        });
      }

      const eduLineCtx = eduLineRef.current?.getContext("2d");
      if (eduLineCtx) {
        charts.current.eduLine?.destroy();
        charts.current.eduLine = new Chart(eduLineCtx, {
          type: "line",
          data: {
            labels: ["Год 1", "Год 2", "Год 3", "Год 4", "Год 5"],
            datasets: [
              { label: "Колледж", data: EDUCATION_GROWTH.college, borderColor: "#9aa08a", backgroundColor: "transparent", tension: 0.35, borderWidth: 2, pointRadius: 4 },
              { label: "Бакалавриат", data: EDUCATION_GROWTH.bachelor, borderColor: INK, backgroundColor: "transparent", tension: 0.35, borderWidth: 2.5, pointRadius: 4 },
              { label: "Магистратура", data: EDUCATION_GROWTH.master, borderColor: LIME, backgroundColor: "rgba(201,241,53,.07)", fill: true, tension: 0.35, borderWidth: 3, pointRadius: 5 },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, border: { display: false } }, y: { border: { display: false } } } },
        });
      }

      const radarCtx = radarRef.current?.getContext("2d");
      if (radarCtx) {
        charts.current.radar?.destroy();
        charts.current.radar = new Chart(radarCtx, {
          type: "radar",
          data: {
            labels: ["Отрасль", "Город", "Hard skills", "Вуз", "Образование", "Тип компании", "Английский", "Стажировка"],
            datasets: [{ data: [95, 90, 75, 55, 45, 50, 45, 65], borderColor: LIME, backgroundColor: "rgba(201,241,53,.1)", pointBackgroundColor: LIME, pointBorderColor: "#1a1d10", borderWidth: 2, pointRadius: 5 }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              r: {
                ticks: { display: false },
                grid: { color: "rgba(255,255,255,.1)" },
                pointLabels: { color: "rgba(255,255,255,.65)", font: { size: 11 } },
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
      Object.values(charts.current).forEach((chart) => chart?.destroy());
    };
  }, [industryLevel, growthData, cityValues]);

  const companyRows = useMemo(() => COMPANIES.map((company, index) => ({ ...company, index: index + 1 })), []);

  return (
    <main className="rsd">
      <header className="page-header">
        <div className="wrap">
          <p className="eyebrow">CareerLab · Исследования · 2025</p>
          <h1 className="ph-title">Зарплаты студентов<br />и молодых специалистов</h1>
          <p className="ph-sub">Актуальная аналитика по 11 отраслям, 10 городам и 3 типам образования. Данные hh.ru, SuperJob, Habr Career, Авито Работа — 2024–2025</p>
        </div>
      </header>
      <div className="kpi-bar">
        <div className="wrap kpi-list">
          <div className="kpi-item"><span className="kpi-n">65 т₽</span><span className="kpi-l">медиана стажёра</span></div>
          <div className="kpi-item"><span className="kpi-n">95 т₽</span><span className="kpi-l">медиана джуниора</span></div>
          <div className="kpi-item"><span className="kpi-n">+47%</span><span className="kpi-l">рост IT за 2 года</span></div>
          <div className="kpi-item"><span className="kpi-n">3.2×</span><span className="kpi-l">Москва vs регионы</span></div>
          <div className="kpi-item"><span className="kpi-n">+30%</span><span className="kpi-l">надбавка топ-вуза</span></div>
          <div className="kpi-item"><span className="kpi-n">5 лет</span><span className="kpi-l">до 300+ т₽ в IT</span></div>
        </div>
      </div>

      <nav className="site-nav">
        <div className="wrap nav-list">
          {navTabs.map(([id, icon, label]) => (
            <a key={id} href={`#${id}`} className={`ntab${activeSection === id ? " on" : ""}`}><span>{icon}</span>{label}</a>
          ))}
        </div>
      </nav>

      <section id="conclusions" className="sec sec--white">
        <div className="wrap">
          <p className="eyebrow">Ключевые выводы</p>
          <h2 className="t-title">Что нужно знать каждому<br />начинающему специалисту</h2>
          <p className="sec-lede">Шесть главных инсайтов из анализа 85 000 вакансий и зарплатных отчётов 2025 года</p>
          <div className="summary-grid">
            <div className="summary-card"><div className="summary-num">2.8×</div><p>IT vs гуманитарные направления</p></div>
            <div className="summary-card"><div className="summary-num">3.2×</div><p>Москва vs регионы у стажёров</p></div>
            <div className="summary-card"><div className="summary-num">+30%</div><p>Надбавка выпускников топ-вузов</p></div>
            <div className="summary-card"><div className="summary-num">5 лет</div><p>До уровня senior в IT</p></div>
          </div>
        </div>
      </section>

      <section id="industries" className="sec sec--bg">
        <div className="wrap">
          <p className="eyebrow">Сравнение отраслей</p>
          <h2 className="t-title">Зарплаты по отраслям</h2>
          <div className="pills">{(["internship", "junior", "middle", "senior"] as IndustryLevel[]).map((level) => <button key={level} className={`pill${industryLevel === level ? " on" : ""}`} onClick={() => setIndustryLevel(level)}>{level === "internship" ? "Стажёр" : level === "junior" ? "Junior" : level === "middle" ? "Middle" : "Senior"}</button>)}</div>
          <div className="card chart-box"><canvas ref={indRef} /></div>
        </div>
      </section>

      <section id="growth" className="sec sec--dark">
        <div className="wrap">
          <p className="eyebrow">Карьерные траектории</p>
          <h2 className="t-title">Рост зарплаты за 8 лет</h2>
          <div className="pills">{(["it", "ds", "cons", "fin"] as GrowthTrack[]).map((track) => <button key={track} className={`pill${growthTrack === track ? " on" : ""}`} onClick={() => setGrowthTrack(track)}>{track === "it" ? "IT-разработка" : track === "ds" ? "Data Science" : track === "cons" ? "Консалтинг" : "Финансы"}</button>)}</div>
          <div className="card card-dark chart-box"><canvas ref={growthRef} /></div>
          <div className="journey">{growthData.roles.map((role, i) => <div key={role + i} className="jstep"><div className="jstep-role">{role}</div><div className="jstep-sal">{growthData.sal[i]} т₽</div></div>)}</div>
        </div>
      </section>

      <section id="cities" className="sec sec--white">
        <div className="wrap">
          <p className="eyebrow">Географическая аналитика</p>
          <h2 className="t-title">Зарплаты по городам</h2>
          <div className="pills">{(["intern", "junior", "middle"] as CityLevel[]).map((level) => <button key={level} className={`pill${cityLevel === level ? " on" : ""}`} onClick={() => setCityLevel(level)}>{level === "intern" ? "Стажёр" : level === "junior" ? "Junior" : "Middle"}</button>)}</div>
          <div className="g2">
            <div className="blist">{CITY_LABELS.map((name, i) => <div key={name} className="brow"><div className="brow-top"><span>{name}</span><span>{cityValues[i]} т₽</span></div><div className="btrack"><div className="bfill" style={{ width: `${Math.round((cityValues[i] / cityMax) * 100)}%` }} /></div></div>)}</div>
            <div className="card chart-box"><canvas ref={cityRef} /></div>
          </div>
        </div>
      </section>

      <section id="universities" className="sec sec--bg">
        <div className="wrap">
          <p className="eyebrow">Аналитика по вузам</p>
          <h2 className="t-title">Влияние вуза на зарплату</h2>
          <div className="pills">{(["it", "econ", "eng"] as UniField[]).map((field) => <button key={field} className={`pill${uniField === field ? " on" : ""}`} onClick={() => setUniField(field)}>{field === "it" ? "IT-специальности" : field === "econ" ? "Экономика / Финансы" : "Инженерия"}</button>)}</div>
          <div className="card blist">{uniData.nm.map((name, i) => <div key={name} className="brow"><div className="brow-top"><span>{name}</span><span>{uniData.sal[i]} т₽</span></div><div className="btrack"><div className="bfill" style={{ width: `${Math.round((uniData.sal[i] / uniMax) * 100)}%` }} /></div></div>)}</div>
        </div>
      </section>

      <section id="companies" className="sec sec--white">
        <div className="wrap g2">
          <div className="card">
            <table className="dtable">
              <thead><tr><th>#</th><th>Компания</th><th>Стажёр</th><th>Junior</th><th>Тип</th></tr></thead>
              <tbody>{companyRows.map((row) => <tr key={row.n}><td>{row.index}</td><td>{row.n}</td><td>{row.s}</td><td>{row.j}</td><td>{row.type}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="card chart-box"><canvas ref={doughnutRef} /></div>
        </div>
      </section>

      <section id="education" className="sec sec--bg">
        <div className="wrap g2">
          <div className="card chart-box"><canvas ref={eduBarRef} /></div>
          <div className="card chart-box"><canvas ref={eduLineRef} /></div>
        </div>
      </section>

      <section id="factors" className="sec sec--dark">
        <div className="wrap">
          <h2 className="t-title">Что влияет на зарплату<br />молодого специалиста</h2>
          <div className="g2">
            <div className="card card-dark chart-box"><canvas ref={radarRef} /></div>
            <div className="factor-grid">
              <div className="ftag">Выбор отрасли <strong>+40–180%</strong></div>
              <div className="ftag">Город / удалёнка <strong>+50–220%</strong></div>
              <div className="ftag">Hard skills <strong>+20–60%</strong></div>
              <div className="ftag">Стажировка в топ-компании <strong>+20–45%</strong></div>
              <div className="ftag">Вуз / диплом <strong>+15–35%</strong></div>
              <div className="ftag">Английский язык <strong>+15–30%</strong></div>
            </div>
          </div>
          <div className="recs">
            <div className="rec">🎯 Выбирайте IT или Data Science</div>
            <div className="rec">🏙️ Работайте на Москву, даже удалённо</div>
            <div className="rec">🔄 Меняйте работодателя каждые 1.5–2 года</div>
            <div className="rec">📚 Начните стажировку на 2–3 курсе</div>
          </div>
        </div>
      </section>
    </main>
  );
}

