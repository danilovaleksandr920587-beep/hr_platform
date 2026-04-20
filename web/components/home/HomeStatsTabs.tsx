"use client";

import { useState } from "react";

export function HomeStatsTabs() {
  const [tab, setTab] = useState<"salary" | "growth">("salary");

  return (
    <>
      <div
        className="cl-stats-tabs cl-reveal"
        role="tablist"
        aria-label="Графики рынка"
      >
        <button
          type="button"
          className={tab === "salary" ? "cl-stab cl-stab--active" : "cl-stab"}
          role="tab"
          aria-selected={tab === "salary"}
          aria-controls="cl-chart-salary"
          id="tab-salary"
          onClick={() => setTab("salary")}
        >
          Зарплаты по сферам
        </button>
        <button
          type="button"
          className={tab === "growth" ? "cl-stab cl-stab--active" : "cl-stab"}
          role="tab"
          aria-selected={tab === "growth"}
          aria-controls="cl-chart-growth"
          id="tab-growth"
          onClick={() => setTab("growth")}
        >
          Рост вакансий
        </button>
      </div>
      <div
        id="cl-chart-salary"
        className={`cl-reveal${tab === "salary" ? " cl-reveal--visible" : ""}`}
        role="tabpanel"
        aria-labelledby="tab-salary"
        hidden={tab !== "salary"}
      >
        <div className="cl-bar-row">
          <span className="cl-bar-label">IT / разработка</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "80%", background: "var(--cl-lime)" }}
            >
              <span>60–120 тыс ₽</span>
            </div>
          </div>
        </div>
        <div className="cl-bar-row">
          <span className="cl-bar-label">Инженерия</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "70%", background: "var(--cl-lime)" }}
            >
              <span>55–100 тыс ₽</span>
            </div>
          </div>
        </div>
        <div className="cl-bar-row">
          <span className="cl-bar-label">Аналитика</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "62%", background: "var(--cl-lime)" }}
            >
              <span>40–90 тыс ₽</span>
            </div>
          </div>
        </div>
        <div className="cl-bar-row">
          <span className="cl-bar-label">Финансы / банки</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "50%", background: "var(--cl-lime)" }}
            >
              <span>35–78 тыс ₽</span>
            </div>
          </div>
        </div>
        <div className="cl-bar-row">
          <span className="cl-bar-label">Маркетинг</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "36%", background: "var(--cl-lime)" }}
            >
              <span>25–60 тыс ₽</span>
            </div>
          </div>
        </div>
        <div className="cl-bar-row">
          <span className="cl-bar-label">Дизайн</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "30%", background: "var(--cl-lime)" }}
            >
              <span>25–55 тыс ₽</span>
            </div>
          </div>
        </div>
        <p className="cl-chart-src">
          Источники: ГородРабот.ру, Авито Работа, hh.ru — данные за 2026 год
        </p>
      </div>
      <div
        id="cl-chart-growth"
        className={`cl-reveal${tab === "growth" ? " cl-reveal--visible" : ""}`}
        role="tabpanel"
        aria-labelledby="tab-growth"
        hidden={tab !== "growth"}
      >
        <div className="cl-bar-row">
          <span className="cl-bar-label">Банки / финансы</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "90%", background: "var(--cl-lime)" }}
            >
              <span>×3 за год</span>
            </div>
          </div>
        </div>
        <div className="cl-bar-row">
          <span className="cl-bar-label">Инженерия</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "76%", background: "var(--cl-lime)" }}
            >
              <span>×2.6 за год</span>
            </div>
          </div>
        </div>
        <div className="cl-bar-row">
          <span className="cl-bar-label">Торговля / ретейл</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "60%", background: "var(--cl-lime)" }}
            >
              <span>+81%</span>
            </div>
          </div>
        </div>
        <div className="cl-bar-row">
          <span className="cl-bar-label">IT / разработка</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "52%", background: "var(--cl-lime)" }}
            >
              <span>+67%</span>
            </div>
          </div>
        </div>
        <div className="cl-bar-row">
          <span className="cl-bar-label">Клиентский сервис</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "38%", background: "var(--cl-lime)" }}
            >
              <span>+48%</span>
            </div>
          </div>
        </div>
        <div className="cl-bar-row">
          <span className="cl-bar-label">Маркетинг</span>
          <div className="cl-bar-track">
            <div
              className="cl-bar-fill"
              style={{ width: "24%", background: "var(--cl-lime)" }}
            >
              <span>+28%</span>
            </div>
          </div>
        </div>
        <p className="cl-chart-src">
          Источник: исследование Авито Работа, апрель 2026
        </p>
      </div>
    </>
  );
}
