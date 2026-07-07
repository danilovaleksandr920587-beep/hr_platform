"use client";

import { useMemo, useState } from "react";
import {
  CITY_LABELS,
  LEVEL_LABELS,
  SALARY_DIRECTIONS,
  cityImpactLabel,
  compareRows,
  getDirection,
  salaryAsOfLabel,
  salaryBand,
  trendLabel,
  type SalaryCity,
  type SalaryLevel,
} from "@/lib/data/salary";

const LEVEL_KEYS = Object.keys(LEVEL_LABELS) as SalaryLevel[];
const CITY_KEYS = Object.keys(CITY_LABELS) as SalaryCity[];

const LEVEL_HINTS: Record<SalaryLevel, string> = {
  intern: "Стартовая позиция",
  junior: "До 1-2 лет опыта",
  middle: "2-4 года опыта",
  senior: "4+ лет, экспертиза",
};

type QuickStart = { label: string; dir: string; level: SalaryLevel; city: SalaryCity };

const QUICK_STARTS: QuickStart[] = [
  { label: "Frontend · Junior · Москва", dir: "frontend", level: "junior", city: "moscow" },
  { label: "QA · Junior · Удалённо", dir: "qa", level: "junior", city: "remote" },
  { label: "Backend · Middle · СПб", dir: "backend", level: "middle", city: "spb" },
  { label: "Аналитика · Стажёр · Москва", dir: "analyst", level: "intern", city: "moscow" },
];

export function SalaryCalculatorPage() {
  const [dirKey, setDirKey] = useState("analyst");
  const [level, setLevel] = useState<SalaryLevel>("intern");
  const [city, setCity] = useState<SalaryCity>("moscow");
  const [calculated, setCalculated] = useState(false);

  const dir = getDirection(dirKey);
  const asOf = useMemo(() => salaryAsOfLabel(), []);
  const band = useMemo(() => salaryBand(dirKey, level, city), [dirKey, level, city]);
  const { low, high, median } = band;
  const pct = useMemo(
    () => ((median - low) / Math.max(high - low, 1)) * 80 + 10,
    [median, low, high],
  );
  const rows = useMemo(() => compareRows(dirKey, level), [dirKey, level]);

  function applyQuickStart(q: QuickStart) {
    setDirKey(q.dir);
    setLevel(q.level);
    setCity(q.city);
    setCalculated(true);
  }

  return (
    <main className="scalc">
      <section className="scalc-hero">
        <div>
          <div className="hero-eyebrow">зарплатный калькулятор</div>
          <h1 className="hero-title">Сколько стоит<br />твоя работа?</h1>
          <p className="hero-sub">Выбери направление, город и уровень — получи реальный диапазон зарплат с объяснением от чего зависит цифра.</p>
        </div>
        <div className="hero-update"><div className="hero-update-dot" />Данные на {asOf}</div>
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
                {SALARY_DIRECTIONS.map((d) => {
                  const [title, sub] = d.name.split(" / ");
                  return (
                    <button key={d.key} type="button" className={`field-option${dirKey === d.key ? " selected" : ""}`} onClick={() => setDirKey(d.key)}>
                      <span className="fo-text">{title}{sub ? <span className="fo-sub"> / {sub}</span> : null}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Уровень</span>
              <div className="field-grid">
                {LEVEL_KEYS.map((v) => (
                  <button key={v} type="button" className={`grid-option${level === v ? " selected" : ""}`} onClick={() => setLevel(v)}>{LEVEL_LABELS[v]}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Город</span>
              <div className="field-grid">
                {CITY_KEYS.map((v) => (
                  <button key={v} type="button" className={`grid-option${city === v ? " selected" : ""}`} onClick={() => setCity(v)}>{CITY_LABELS[v]}</button>
                ))}
              </div>
            </div>

            <button className="calc-btn" type="button" onClick={() => setCalculated(true)}>Рассчитать зарплату</button>
          </div>
        </div>

        <div className="results-area">
          {!calculated ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0d0f08" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="5" width="3" height="13" /></svg>
              </div>
              <div className="empty-title">Выберите направление и уровень</div>
              <div className="empty-sub">Три клика - и вы увидите вилку зарплат, медиану и что на неё влияет.</div>
              <div className="quick-starts">
                <div className="quick-starts-label">Популярные комбинации</div>
                <div className="quick-starts-chips">
                  {QUICK_STARTS.map((q) => (
                    <button key={q.label} type="button" className="quick-chip" onClick={() => applyQuickStart(q)}>
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="salary-hero">
                <div className="sh-label">Диапазон зарплат · {CITY_LABELS[city]} · {LEVEL_LABELS[level]}</div>
                <div className="sh-role">{dir.name}</div>
                <div className="sh-range"><span className="sh-from">{low} 000</span><span className="sh-dash">—</span><span className="sh-to">{high} 000 ₽</span></div>
                <div className="sh-note">до вычета НДФЛ · данные на {asOf}</div>
                <div className="sh-median"><span className="sh-median-label">Медиана:</span><span className="sh-median-val">{median} 000 ₽</span><span className="sh-median-badge">Рынок растёт {trendLabel(dirKey)}</span></div>
              </div>

              <div className="range-bar-card">
                <div className="rbc-title">Как распределяются предложения</div>
                <div className="range-track"><div className="range-fill" style={{ left: "5%", width: "90%" }} /><div className="range-median-line" style={{ left: `${pct}%` }} /></div>
                <div className="range-labels"><span>Нижняя граница</span><span>↑ Медиана</span><span>Верхняя граница</span></div>
                <div className="range-markers"><span>{low} тыс ₽</span><span>{median} тыс ₽</span><span>{high} тыс ₽</span></div>
                <div className="rbc-growth-wrap">
                  <strong className="rbc-growth-title">Что влияет на попадание в топ диапазона:</strong>
                  <div className="rbc-growth-tags">
                    {dir.growthFactors.map((factor) => (
                      <span key={factor} className="rbc-growth-tag">{factor}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="factors-grid">
                <div className="factor-card">
                  <div className="fc-label">Влияние города</div>
                  <div className="fc-value">{CITY_LABELS[city]}</div>
                  <div className={`fc-impact${city === "moscow" ? " impact-up" : " impact-down"}`}>{cityImpactLabel(city)}</div>
                </div>
                <div className="factor-card">
                  <div className="fc-label">Тренд рынка</div>
                  <div className="fc-value">{trendLabel(dirKey)}</div>
                  <div className="fc-impact impact-up">Рост выше инфляции</div>
                </div>
                <div className="factor-card">
                  <div className="fc-label">Уровень</div>
                  <div className="fc-value">{LEVEL_LABELS[level]}</div>
                  <div className="fc-impact">{LEVEL_HINTS[level]}</div>
                </div>
                <div className="factor-card">
                  <div className="fc-label">Тип компании</div>
                  <div className="fc-value">Продукт {'>'} Аутсорс</div>
                  <div className="fc-impact">Разница до <span className="impact-up">+30%</span></div>
                </div>
              </div>

              <div className="ai-insight">
                <div className="ai-header"><div className="ai-dot" /><span className="ai-header-title">Объяснение от AI</span><span className="ai-header-sub">CareerLab AI</span></div>
                <div className="ai-body"><div className="ai-text">Для профиля <strong>{dir.name}</strong> в локации <strong>{CITY_LABELS[city]}</strong> рынок сейчас даёт диапазон <strong>{low}–{high} тыс ₽</strong>. Чтобы попасть в верхнюю часть вилки, усиливайте навыки: {dir.growthFactors.join(", ")}.</div></div>
              </div>

              <div className="comp-table">
                <div className="comp-table-header">
                  <div className="comp-table-title">Как опыт влияет на зарплату · {dir.name}</div>
                </div>
                <table className="comp">
                  <thead>
                    <tr>
                      <th>Профиль</th>
                      <th>Зарплата в Москве</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([label, rowLow, rowHigh], index) => (
                      <tr key={label} className={index === 1 ? "highlight" : ""}>
                        <td>{label}</td>
                        <td className="td-salary">{rowLow} 000 – {rowHigh} 000 ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="tips-card">
                <div className="tips-title">Как попасть в <em>топ диапазона</em></div>
                <div className="tip-row"><div className="tip-row-num">01</div><div className="tip-row-text">Усильте навык: {dir.growthFactors[0]}</div></div>
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
