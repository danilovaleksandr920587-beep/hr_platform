"use client";

import { useMemo, useState } from "react";

type Dir = "analyst" | "frontend" | "backend" | "marketing" | "design" | "pm";
type Level = "intern" | "junior" | "middle" | "senior";
type City = "moscow" | "spb" | "regions" | "remote";

type SalaryBand = {
  moscow: [number, number];
  spb: [number, number];
  regions: [number, number];
  remote: [number, number];
  median: number;
};

type DirData = {
  name: string;
  intern: SalaryBand;
  junior: SalaryBand;
  middle: SalaryBand;
  senior: SalaryBand;
  growthFactors: string[];
  marketTrend: string;
};

const salaryData: Record<Dir, DirData> = {
  analyst: {
    name: "Аналитика / Data",
    intern: { moscow: [45, 80], spb: [35, 65], regions: [25, 50], remote: [35, 65], median: 60 },
    junior: { moscow: [90, 140], spb: [75, 120], regions: [55, 90], remote: [80, 130], median: 110 },
    middle: { moscow: [160, 240], spb: [140, 200], regions: [100, 160], remote: [150, 220], median: 190 },
    senior: { moscow: [280, 400], spb: [240, 340], regions: [170, 260], remote: [260, 370], median: 330 },
    growthFactors: ["SQL (обязателен)", "Python / pandas", "BI-инструменты", "A/B тесты"],
    marketTrend: "+18% за год",
  },
  frontend: {
    name: "Разработка / Frontend",
    intern: { moscow: [45, 90], spb: [35, 70], regions: [25, 55], remote: [40, 80], median: 65 },
    junior: { moscow: [90, 150], spb: [80, 130], regions: [55, 100], remote: [85, 140], median: 115 },
    middle: { moscow: [180, 280], spb: [160, 250], regions: [120, 190], remote: [170, 260], median: 215 },
    senior: { moscow: [300, 450], spb: [260, 400], regions: [180, 300], remote: [280, 420], median: 360 },
    growthFactors: ["React/Vue", "TypeScript", "тестирование", "архитектура"],
    marketTrend: "+12% за год",
  },
  backend: {
    name: "Разработка / Backend",
    intern: { moscow: [50, 95], spb: [40, 75], regions: [28, 58], remote: [45, 85], median: 70 },
    junior: { moscow: [95, 160], spb: [85, 140], regions: [60, 110], remote: [90, 150], median: 120 },
    middle: { moscow: [190, 300], spb: [170, 260], regions: [130, 200], remote: [180, 270], median: 230 },
    senior: { moscow: [320, 500], spb: [280, 430], regions: [200, 320], remote: [300, 460], median: 390 },
    growthFactors: ["язык стека", "базы данных", "микросервисы", "DevOps"],
    marketTrend: "+15% за год",
  },
  marketing: {
    name: "Маркетинг / SMM / Growth",
    intern: { moscow: [25, 50], spb: [20, 42], regions: [15, 35], remote: [20, 45], median: 38 },
    junior: { moscow: [60, 100], spb: [50, 88], regions: [35, 65], remote: [55, 95], median: 78 },
    middle: { moscow: [110, 180], spb: [95, 160], regions: [70, 120], remote: [100, 170], median: 140 },
    senior: { moscow: [200, 320], spb: [170, 270], regions: [120, 200], remote: [180, 290], median: 250 },
    growthFactors: ["таргет ВК/TG", "аналитика", "контент-стратегия", "CJM"],
    marketTrend: "+8% за год",
  },
  design: {
    name: "Дизайн / UX/UI",
    intern: { moscow: [30, 60], spb: [25, 50], regions: [18, 40], remote: [28, 55], median: 45 },
    junior: { moscow: [70, 120], spb: [60, 105], regions: [45, 80], remote: [65, 110], median: 90 },
    middle: { moscow: [130, 210], spb: [115, 185], regions: [85, 140], remote: [120, 195], median: 165 },
    senior: { moscow: [230, 370], spb: [200, 320], regions: [145, 240], remote: [210, 340], median: 290 },
    growthFactors: ["Figma", "UX-исследования", "дизайн-система", "анимации"],
    marketTrend: "+10% за год",
  },
  pm: {
    name: "Продакт / Проджект",
    intern: { moscow: [40, 75], spb: [33, 62], regions: [22, 48], remote: [35, 68], median: 56 },
    junior: { moscow: [85, 140], spb: [72, 120], regions: [50, 88], remote: [78, 130], median: 108 },
    middle: { moscow: [160, 260], spb: [140, 220], regions: [100, 170], remote: [150, 240], median: 200 },
    senior: { moscow: [280, 440], spb: [240, 370], regions: [170, 280], remote: [260, 400], median: 350 },
    growthFactors: ["метрики продукта", "SQL", "A/B тесты", "Jira/Notion"],
    marketTrend: "+16% за год",
  },
};

const levelNames: Record<Level, string> = {
  intern: "Стажёр",
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
};

const cityNames: Record<City, string> = {
  moscow: "Москва",
  spb: "Санкт-Петербург",
  regions: "Регионы",
  remote: "Удалённо",
};

export function SalaryCalculatorPage() {
  const [dir, setDir] = useState<Dir>("analyst");
  const [level, setLevel] = useState<Level>("intern");
  const [city, setCity] = useState<City>("moscow");
  const [calculated, setCalculated] = useState(false);

  const data = salaryData[dir];
  const levelData = data[level];
  const [low, high] = levelData[city];
  const median = levelData.median;
  const pct = useMemo(() => ((median - low) / Math.max(high - low, 1)) * 80 + 10, [median, low, high]);

  return (
    <main className="scalc">
      <section className="scalc-hero">
        <div>
          <div className="hero-eyebrow">зарплатный калькулятор</div>
          <h1 className="hero-title">Сколько стоит<br />твоя работа?</h1>
          <p className="hero-sub">Выбери направление, город и уровень — получи реальный диапазон зарплат с объяснением от чего зависит цифра.</p>
        </div>
        <div className="hero-update"><div className="hero-update-dot" />Данные за Q1 2026</div>
      </section>

      <section className="scalc-page">
        <div className="calc-panel">
          <div className="calc-header">
            <div className="calc-header-title">Настройте параметры</div>
            <div className="calc-header-sub">3 параметра — и вы знаете свой рынок</div>
          </div>
          <div className="calc-body">
            <div className="field">
              <span className="field-label">Направление</span>
              <div className="field-options">
                {([
                  ["analyst", "📊", "Аналитика", "Data"],
                  ["frontend", "💻", "Разработка", "Frontend"],
                  ["backend", "⚙️", "Разработка", "Backend"],
                  ["marketing", "📣", "Маркетинг", "SMM / Growth"],
                  ["design", "🎨", "Дизайн", "UX/UI"],
                  ["pm", "🚀", "Продакт", "Project"],
                ] as Array<[Dir, string, string, string]>).map(([v, icon, title, sub]) => (
                  <button key={v} type="button" className={`field-option${dir === v ? " selected" : ""}`} onClick={() => setDir(v)}>
                    <span className="fo-icon">{icon}</span>
                    <span className="fo-text">{title} <span className="fo-sub">/ {sub}</span></span>
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Уровень</span>
              <div className="field-grid">
                {(["intern", "junior", "middle", "senior"] as Level[]).map((v) => (
                  <button key={v} type="button" className={`grid-option${level === v ? " selected" : ""}`} onClick={() => setLevel(v)}>{levelNames[v]}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Город</span>
              <div className="field-grid">
                {(["moscow", "spb", "regions", "remote"] as City[]).map((v) => (
                  <button key={v} type="button" className={`grid-option${city === v ? " selected" : ""}`} onClick={() => setCity(v)}>{cityNames[v]}</button>
                ))}
              </div>
            </div>

            <button className="calc-btn" type="button" onClick={() => setCalculated(true)}>Рассчитать зарплату ✦</button>
          </div>
        </div>

        <div className="results-area">
          {!calculated ? (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <div className="empty-title">Настройте параметры</div>
              <div className="empty-sub">Выберите направление, уровень и город — и нажмите «Рассчитать». Получите реальный диапазон зарплат с объяснением.</div>
            </div>
          ) : (
            <>
              <div className="salary-hero">
                <div className="sh-label">Диапазон зарплат · {cityNames[city]} · {levelNames[level]}</div>
                <div className="sh-role">{data.name}</div>
                <div className="sh-range"><span className="sh-from">{low} 000</span><span className="sh-dash">—</span><span className="sh-to">{high} 000 ₽</span></div>
                <div className="sh-note">до вычета НДФЛ · данные за Q1 2026</div>
                <div className="sh-median"><span className="sh-median-label">Медиана:</span><span className="sh-median-val">{median} 000 ₽</span><span className="sh-median-badge">Рынок растёт {data.marketTrend}</span></div>
              </div>

              <div className="range-bar-card">
                <div className="rbc-title">Как распределяются предложения</div>
                <div className="range-track"><div className="range-fill" style={{ left: "5%", width: "90%" }} /><div className="range-median-line" style={{ left: `${pct}%` }} /></div>
                <div className="range-markers"><span>{low} тыс ₽</span><span>{median} тыс ₽</span><span>{high} тыс ₽</span></div>
              </div>

              <div className="ai-insight">
                <div className="ai-header"><div className="ai-dot" /><span className="ai-header-title">Объяснение</span></div>
                <div className="ai-body"><div className="ai-text">Для профиля <strong>{data.name}</strong> в локации <strong>{cityNames[city]}</strong> рынок сейчас даёт диапазон <strong>{low}–{high} тыс ₽</strong>. Чтобы попасть в верхнюю часть вилки, усиливайте навыки: {data.growthFactors.join(", ")}.</div></div>
              </div>

              <div className="tips-card">
                <div className="tips-title">Как попасть в <em>топ диапазона</em></div>
                <div className="tip-row"><div className="tip-row-num">01</div><div className="tip-row-text">Усильте навык: {data.growthFactors[0]}</div></div>
                <div className="tip-row"><div className="tip-row-num">02</div><div className="tip-row-text">Добавьте цифры и метрики в резюме и кейсы.</div></div>
                <div className="tip-row"><div className="tip-row-num">03</div><div className="tip-row-text">В переговорах называйте диапазон от {Math.round(median * 0.9)} тыс ₽.</div></div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
