"use client";

import { useMemo, useState } from "react";

type Issue = { type: "critical" | "warning" | "good"; title: string; description: string; fix?: string };
type Section = { id: string; title: string; icon: string; status: "critical" | "warning" | "good"; issues: Issue[] };

function scoreResume(resume: string, vacancy: string) {
  const r = resume.toLowerCase();
  const v = vacancy.toLowerCase();
  const must = ["sql", "python", "react", "typescript", "excel", "figma", "аналит", "метрик"];
  const required = must.filter((k) => v.includes(k));
  const matched = required.filter((k) => r.includes(k));
  const matchRate = required.length ? matched.length / required.length : 0.5;
  const hasNumbers = /\d/.test(resume);
  const hasExperience = /опыт|experience|стаж|project|проект/i.test(resume);
  const hasStructure = /навыки|skills|образование|education|опыт|experience/i.test(resume);

  let score = Math.round(matchRate * 55 + (hasNumbers ? 15 : 0) + (hasExperience ? 15 : 0) + (hasStructure ? 15 : 0));
  score = Math.max(20, Math.min(score, 95));

  const sections: Section[] = [
    {
      id: "skills",
      title: "Совпадение навыков",
      icon: "🎯",
      status: matchRate > 0.7 ? "good" : matchRate > 0.45 ? "warning" : "critical",
      issues:
        required.length === 0
          ? [{ type: "warning", title: "Требования сложно распарсить", description: "В вакансии мало ключевых навыков. Вставьте полное описание для точного анализа." }]
          : [
              ...(matched.length
                ? [{ type: "good" as const, title: `Совпадает ${matched.length} из ${required.length} ключевых навыков`, description: `Найдены совпадения: ${matched.join(", ")}.` }]
                : []),
              ...(required.filter((k) => !matched.includes(k)).slice(0, 3).map((k) => ({
                type: "critical" as const,
                title: `В резюме не найден навык: ${k}`,
                description: `Вакансия явно требует ${k}, но в резюме нет упоминаний.`,
                fix: `Добавьте конкретный блок с ${k} и примером задачи/результата.`,
              }))),
            ],
    },
    {
      id: "experience",
      title: "Описание опыта",
      icon: "💼",
      status: hasExperience ? "good" : "warning",
      issues: hasExperience
        ? [{ type: "good", title: "Опыт/проекты указаны", description: "В резюме есть блоки про опыт или проекты." }]
        : [{ type: "warning", title: "Мало сигналов опыта", description: "Рекрутеру сложно понять практический бэкграунд.", fix: "Добавьте 2-3 проекта по схеме: что сделали → чем → какой результат." }],
    },
    {
      id: "structure",
      title: "Структура и ATS",
      icon: "📋",
      status: hasStructure ? "good" : "warning",
      issues: [
        ...(hasStructure ? [{ type: "good" as const, title: "Базовая структура читаема", description: "Есть типовые секции, ATS сможет распознать резюме." }] : [{ type: "warning" as const, title: "Нет стандартных секций", description: "Не видны типовые заголовки секций (Навыки/Опыт/Образование).", fix: "Добавьте секции с простыми и понятными заголовками." }]),
        ...(hasNumbers ? [{ type: "good" as const, title: "Есть цифры и метрики", description: "В резюме присутствуют измеримые результаты." }] : [{ type: "warning" as const, title: "Нет измеримых результатов", description: "Мало цифр, которые доказывают результативность.", fix: "Добавьте минимум 2-3 метрики: %, время, объём, количество." }]),
      ],
    },
  ];

  const topActions = [
    required.filter((k) => !matched.includes(k)).length
      ? `Добавить в резюме недостающие требования: ${required.filter((k) => !matched.includes(k)).slice(0, 3).join(", ")}`
      : "Усилить формулировки ключевых навыков под текст вакансии",
    hasNumbers ? "Расширить блок достижений ещё 1-2 метриками" : "Добавить измеримые результаты (цифры, проценты, сроки)",
    "Адаптировать резюме под эту вакансию: порядок секций и словарь требований",
  ];

  return {
    score,
    verdict:
      score >= 70
        ? "Резюме хорошо совпадает с вакансией, но есть точки роста перед откликом."
        : score >= 45
          ? "Есть заметные пробелы: лучше доработать резюме перед отправкой."
          : "Сильное расхождение с требованиями: нужна глубокая доработка.",
    sections,
    topActions,
  };
}

const examples: Record<string, string> = {
  analyst: `Продуктовый аналитик (стажировка)\n\nТребования:\n— SQL: JOIN, GROUP BY, оконные функции\n— Excel / Google Sheets\n— продуктовые метрики\n\nБудет плюсом:\n— Python (pandas)\n— BI (Tableau/Metabase)`,
  frontend: `Стажёр Frontend-разработчик\n\nТребования:\n— HTML, CSS\n— JavaScript / TypeScript\n— React\n— Git\n\nБудет плюсом:\n— REST API\n— Figma`,
  marketing: `Стажёр маркетолог\n\nТребования:\n— контент и грамотная речь\n— аналитика CTR/ER\n— базовый таргет\n\nБудет плюсом:\n— Canva/Figma`,
  pm: `Junior Product Manager\n\nТребования:\n— продуктовые метрики\n— гипотезы и A/B\n— коммуникация с разработкой\n— SQL базово`,
};

export function ResumeAnalyzerPage() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [vacancyText, setVacancyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof scoreResume> | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ skills: true });

  const canNext1 = mode === "text" ? resumeText.trim().length >= 50 : resumeText.length >= 50;
  const canAnalyze = vacancyText.trim().length >= 30;

  const loadingText = useMemo(() => {
    if (!loading) return "";
    return "Читаю резюме, сравниваю с вакансией и собираю рекомендации...";
  }, [loading]);

  function onFile(file: File | null) {
    if (!file) return;
    setResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setResumeText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function analyze() {
    setStep(3);
    setLoading(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 1200));
    const scored = scoreResume(resumeText, vacancyText);
    setResult(scored);
    setLoading(false);
  }

  return (
    <main className="ranalyzer">
      <section className="ra-hero">
        <div>
          <div className="hero-badge"><div className="hero-badge-dot" /><span className="hero-badge-text">AI-анализ в стиле CareerLab</span></div>
          <h1 className="hero-title">AI-разбор<br /><span>резюме</span></h1>
          <p className="hero-sub">Загрузите резюме и вакансию — получите конкретный список правок перед откликом.</p>
        </div>
        <div className="hero-stats">
          <div className="hero-stat-card"><span className="hsc-icon">⚡</span><div><div className="hsc-num">~30 сек</div><div className="hsc-label">время анализа</div></div></div>
          <div className="hero-stat-card"><span className="hsc-icon">🎯</span><div><div className="hsc-num">7 критериев</div><div className="hsc-label">оценки резюме</div></div></div>
        </div>
      </section>

      <section className="ra-page">
        <div className="tool-card">
          <div className="steps-bar">
            {[1, 2, 3].map((n) => (
              <button key={n} className={`step-tab${step === n ? " active" : ""}${step > n ? " done" : ""}`} onClick={() => setStep(n)}>
                <div className="step-num">{n}</div>
                <span className="step-label">{n === 1 ? "Резюме" : n === 2 ? "Вакансия" : "Результат"}</span>
              </button>
            ))}
          </div>

          {step === 1 ? (
            <div className="panel active">
              <div className="panel-title">Добавьте резюме</div>
              <div className="panel-sub">Загрузите файл или вставьте текст.</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <button className="btn-outline" style={{ flex: 1, borderColor: mode === "file" ? "var(--dark)" : undefined, color: mode === "file" ? "var(--dark)" : undefined }} onClick={() => setMode("file")}>📄 Загрузить файл</button>
                <button className="btn-outline" style={{ flex: 1, borderColor: mode === "text" ? "var(--dark)" : undefined, color: mode === "text" ? "var(--dark)" : undefined }} onClick={() => setMode("text")}>✏️ Вставить текст</button>
              </div>

              {mode === "file" ? (
                <label className={`upload-zone${resumeFileName ? " has-file" : ""}`}>
                  <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                  <span className="upload-icon">📋</span>
                  <div className="upload-title">Перетащите файл сюда</div>
                  <div className="upload-sub">или нажмите для выбора</div>
                  <div className="upload-formats">PDF, DOCX, TXT до 5 МБ</div>
                  {resumeFileName ? <div className="file-preview"><span className="file-icon">📄</span><span className="file-name">{resumeFileName}</span></div> : null}
                </label>
              ) : (
                <textarea className="resume-textarea" placeholder="Вставьте текст резюме" value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
              )}

              <div style={{ marginTop: 20 }}>
                <button className="btn-primary" disabled={!canNext1} onClick={() => setStep(2)}>Далее: добавить вакансию →</button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="panel active">
              <div className="panel-title">Добавьте вакансию</div>
              <div className="panel-sub">Вставьте текст вакансии или выберите пример.</div>
              <textarea className="resume-textarea" style={{ minHeight: 220 }} value={vacancyText} onChange={(e) => setVacancyText(e.target.value)} placeholder="Вставьте описание вакансии" />
              <div className="vacancy-examples" style={{ marginTop: 12 }}>
                <button className="vex" onClick={() => setVacancyText(examples.analyst)}>Продуктовый аналитик</button>
                <button className="vex" onClick={() => setVacancyText(examples.frontend)}>Frontend</button>
                <button className="vex" onClick={() => setVacancyText(examples.marketing)}>Маркетолог</button>
                <button className="vex" onClick={() => setVacancyText(examples.pm)}>Продакт</button>
              </div>
              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <button className="btn-outline" onClick={() => setStep(1)}>← Назад</button>
                <button className="btn-primary" style={{ flex: 1 }} disabled={!canAnalyze} onClick={analyze}>Проанализировать резюме ✦</button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="panel active">
              {loading ? (
                <div className="loading-state">
                  <div className="loader" />
                  <div className="loading-title">Анализирую резюме...</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{loadingText}</div>
                </div>
              ) : result ? (
                <>
                  <div className="result-score">
                    <div className="score-circle"><span className="score-num">{result.score}</span></div>
                    <div>
                      <div className="score-title">Совпадение с вакансией</div>
                      <div className="score-sub">{result.verdict}</div>
                    </div>
                  </div>

                  <div className="result-sections">
                    {result.sections.map((s) => (
                      <div key={s.id} className={`result-section${openSections[s.id] ? " open" : ""}`}>
                        <div className="result-section-header" onClick={() => setOpenSections((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}>
                          <span className="rsh-icon">{s.icon}</span>
                          <span className="rsh-title">{s.title}</span>
                          <span className={`rsh-badge ${s.status === "critical" ? "badge-crit" : s.status === "warning" ? "badge-warn" : "badge-good"}`}>{s.status === "critical" ? "Критично" : s.status === "warning" ? "Есть замечания" : "Хорошо"}</span>
                          <span className="rsh-arrow">▼</span>
                        </div>
                        {openSections[s.id] ? (
                          <div className="result-section-body">
                            {s.issues.map((issue, i) => (
                              <div key={i} className="issue-item">
                                <div className={`issue-dot ${issue.type === "critical" ? "dot-red" : issue.type === "warning" ? "dot-yellow" : "dot-green"}`} />
                                <div className="issue-text">
                                  <strong>{issue.title}</strong>
                                  {issue.description}
                                  {issue.fix ? <div className="issue-fix">{issue.fix}</div> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div className="panel-sub" style={{ marginBottom: 8 }}>Топ-3 действия:</div>
                    <div className="vacancy-box">
                      {result.topActions.map((a, i) => (
                        <div key={i} className="tip-item"><span className="tip-num">{String(i + 1).padStart(2, "0")}</span>{a}</div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
                    <button className="btn-outline" onClick={() => { setStep(1); setResult(null); }}>↺ Проверить другое резюме</button>
                    <button className="btn-lime" style={{ flex: 1 }}>Найти подходящие вакансии →</button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="sidebar">
          <div className="side-card">
            <div className="side-card-header"><span className="side-card-icon">💡</span><span className="side-card-title">Что проверяется</span></div>
            <div className="side-card-body">
              <div className="tip-item"><span className="tip-num">01</span>Совпадение навыков с требованиями</div>
              <div className="tip-item"><span className="tip-num">02</span>Конкретность опыта и результатов</div>
              <div className="tip-item"><span className="tip-num">03</span>Структура и ATS-читаемость</div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
