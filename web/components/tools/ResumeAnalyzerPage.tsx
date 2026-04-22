"use client";

import { useMemo, useRef, useState } from "react";
import { saveResumeAnalysis } from "@/lib/client/resume-analysis";
import type { ResumeAnalysisResult, AnalysisSection } from "@/lib/client/resume-analysis";

// ─── Local fallback (used when API unavailable) ────────────────────────────────

function scoreLocal(resume: string, vacancy: string): ResumeAnalysisResult {
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

  const sections: AnalysisSection[] = [
    {
      id: "skills", title: "Навыки и требования", icon: "🎯",
      status: matchRate > 0.7 ? "good" : matchRate > 0.45 ? "warning" : "critical",
      issues: required.length === 0
        ? [{ type: "warning", title: "Добавьте полный текст вакансии", description: "Для точного анализа навыков вставьте полное описание вакансии." }]
        : [
            ...(matched.length ? [{ type: "good" as const, title: `${matched.length} из ${required.length} навыков совпадают`, description: `Совпадения: ${matched.join(", ")}.` }] : []),
            ...required.filter(k => !matched.includes(k)).slice(0, 3).map(k => ({
              type: "critical" as const, title: `Навык не найден: ${k}`,
              description: `Вакансия требует ${k}, в резюме упоминаний нет.`,
              fix: `Добавьте блок с ${k} и конкретным примером использования.`,
            })),
          ],
    },
    {
      id: "experience", title: "Опыт и результаты", icon: "💼",
      status: hasExperience ? "good" : "warning",
      issues: hasExperience
        ? [{ type: "good", title: "Опыт/проекты присутствуют", description: "В резюме есть описание опыта или проектов." }]
        : [{ type: "warning", title: "Мало конкретики в опыте", description: "Рекрутёру сложно понять практический бэкграунд.", fix: "Добавьте 2-3 проекта: что сделали → чем → результат." }],
    },
    {
      id: "structure", title: "Структура и ATS", icon: "📋",
      status: hasStructure ? "good" : "warning",
      issues: [
        ...(hasStructure ? [{ type: "good" as const, title: "Структура читаема", description: "Есть стандартные секции, ATS распознает резюме." }]
          : [{ type: "warning" as const, title: "Нет стандартных секций", description: "ATS может не прочитать резюме без заголовков.", fix: "Добавьте секции: Навыки / Опыт / Образование." }]),
        ...(hasNumbers ? [{ type: "good" as const, title: "Есть цифры и метрики", description: "Измеримые результаты повышают доверие." }]
          : [{ type: "warning" as const, title: "Нет метрик", description: "Нет цифр, подтверждающих результаты.", fix: "Добавьте 2-3 метрики: %, объём данных, скорость." }]),
      ],
    },
    {
      id: "fit", title: "Соответствие уровню", icon: "🏆",
      status: score >= 60 ? "good" : score >= 40 ? "warning" : "critical",
      issues: [{ type: score >= 60 ? "good" : "warning", title: score >= 60 ? "Уровень соответствует" : "Есть пробелы", description: score >= 60 ? "Резюме подходит под требования вакансии." : "Нужна доработка под конкретную вакансию." }],
    },
  ];

  return {
    score,
    verdict: score >= 70 ? "Резюме хорошо совпадает с вакансией, есть небольшие точки роста."
      : score >= 45 ? "Есть заметные пробелы: доработайте резюме перед откликом."
      : "Сильное расхождение с требованиями: нужна глубокая доработка.",
    sections,
    topActions: [
      required.filter(k => !matched.includes(k)).length ? `Добавить навыки: ${required.filter(k => !matched.includes(k)).slice(0, 3).join(", ")}` : "Усилить ключевые навыки под текст вакансии",
      hasNumbers ? "Расширить блок достижений ещё 1-2 метриками" : "Добавить измеримые результаты (%, объём, скорость)",
      "Адаптировать порядок секций и словарь под конкретную вакансию",
    ],
  };
}

// ─── Examples ─────────────────────────────────────────────────────────────────

const examples: Record<string, string> = {
  analyst: `Продуктовый аналитик (стажировка)\n\nТребования:\n— SQL: JOIN, GROUP BY, оконные функции\n— Excel / Google Sheets\n— продуктовые метрики\n\nБудет плюсом:\n— Python (pandas)\n— BI (Tableau/Metabase)`,
  frontend: `Стажёр Frontend-разработчик\n\nТребования:\n— HTML, CSS\n— JavaScript / TypeScript\n— React\n— Git\n\nБудет плюсом:\n— REST API\n— Figma`,
  marketing: `Стажёр маркетолог\n\nТребования:\n— контент и грамотная речь\n— аналитика CTR/ER\n— базовый таргет\n\nБудет плюсом:\n— Canva/Figma`,
  pm: `Junior Product Manager\n\nТребования:\n— продуктовые метрики\n— гипотезы и A/B\n— коммуникация с разработкой\n— SQL базово`,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ResumeAnalyzerPage({ userScope }: { userScope?: string | null }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [vacancyText, setVacancyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ skills: true });
  const [dragOver, setDragOver] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canNext1 = mode === "text" ? resumeText.trim().length >= 50 : resumeText.length >= 50;
  const canAnalyze = vacancyText.trim().length >= 30;

  const loadingSteps = ["Читаю резюме...", "Сравниваю с требованиями вакансии...", "Формирую рекомендации..."];
  const [loadingStep, setLoadingStep] = useState(0);

  function onFile(file: File | null) {
    if (!file) return;
    setResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setResumeText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave() { setDragOver(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    onFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function analyze() {
    setStep(3);
    setLoading(true);
    setResult(null);
    setAiError(null);
    setLoadingStep(0);

    const stepTimer1 = setTimeout(() => setLoadingStep(1), 1200);
    const stepTimer2 = setTimeout(() => setLoadingStep(2), 3000);

    let finalResult: ResumeAnalysisResult;

    try {
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, vacancyText }),
        signal: AbortSignal.timeout(50_000),
      });

      const data = (await res.json()) as { result?: ResumeAnalysisResult; error?: string };

      if (!res.ok || !data.result) {
        // Fallback to local scoring
        setAiError(data.error ?? "AI недоступен");
        finalResult = scoreLocal(resumeText, vacancyText);
      } else {
        finalResult = data.result;
      }
    } catch {
      setAiError("Не удалось связаться с сервером");
      finalResult = scoreLocal(resumeText, vacancyText);
    }

    clearTimeout(stepTimer1);
    clearTimeout(stepTimer2);

    // Save to localStorage for office dashboard
    saveResumeAnalysis(finalResult, userScope ?? null);

    setResult(finalResult);
    setLoading(false);
  }

  return (
    <main className="ranalyzer">
      <section className="ra-hero">
        <div>
          <div className="hero-badge"><div className="hero-badge-dot" /><span className="hero-badge-text">AI-анализ · YandexGPT</span></div>
          <h1 className="hero-title">AI-разбор<br /><span>резюме</span></h1>
          <p className="hero-sub">Загрузите резюме и вакансию — получите конкретный список правок перед откликом.</p>
        </div>
        <div className="hero-stats">
          <div className="hero-stat-card"><span className="hsc-icon">⚡</span><div><div className="hsc-num">~30 сек</div><div className="hsc-label">время анализа</div></div></div>
          <div className="hero-stat-card"><span className="hsc-icon">🎯</span><div><div className="hsc-num">4 критерия</div><div className="hsc-label">оценки резюме</div></div></div>
        </div>
      </section>

      <section className="ra-page">
        <div className="tool-card">
          <div className="steps-bar">
            {[1, 2, 3].map((n) => (
              <button key={n} className={`step-tab${step === n ? " active" : ""}${step > n ? " done" : ""}`} onClick={() => { if (n < step || (n === 2 && resumeText)) setStep(n); }}>
                <div className="step-num">{n}</div>
                <span className="step-label">{n === 1 ? "Резюме" : n === 2 ? "Вакансия" : "Результат"}</span>
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="ra-panel">
              <div className="panel-title">Добавьте резюме</div>
              <div className="panel-sub">Загрузите файл или вставьте текст.</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <button className="btn-outline" style={{ flex: 1, borderColor: mode === "file" ? "var(--dark)" : undefined, color: mode === "file" ? "var(--dark)" : undefined }} onClick={() => setMode("file")}>📄 Загрузить файл</button>
                <button className="btn-outline" style={{ flex: 1, borderColor: mode === "text" ? "var(--dark)" : undefined, color: mode === "text" ? "var(--dark)" : undefined }} onClick={() => setMode("text")}>✏️ Вставить текст</button>
              </div>

              {mode === "file" ? (
                <div
                  className={`upload-zone${resumeFileName ? " has-file" : ""}${dragOver ? " drag-over" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                  <div className="upload-icon">📋</div>
                  <div className="upload-title">{dragOver ? "Отпустите файл" : "Перетащите файл сюда"}</div>
                  <div className="upload-sub">или нажмите для выбора</div>
                  <div className="upload-formats">PDF, DOCX, TXT до 5 МБ</div>
                  {resumeFileName && <div className="file-preview"><span className="file-icon">📄</span><span className="file-name">{resumeFileName}</span></div>}
                </div>
              ) : (
                <textarea className="resume-textarea" placeholder="Вставьте текст резюме" value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
              )}

              <div style={{ marginTop: 20 }}>
                <button className="btn-primary" disabled={!canNext1} onClick={() => setStep(2)}>Далее: добавить вакансию →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="ra-panel">
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
          )}

          {step === 3 && (
            <div className="ra-panel">
              {loading ? (
                <div className="loading-state">
                  <div className="loader" />
                  <div className="loading-title">Анализирую резюме...</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>{loadingSteps[loadingStep]}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, opacity: 0.6 }}>Powered by YandexGPT</div>
                </div>
              ) : result ? (
                <>
                  {aiError && (
                    <div style={{ padding: "8px 14px", background: "#fff4d6", borderRadius: 10, fontSize: 12, color: "#7a5a00", marginBottom: 16 }}>
                      ⚠ AI-анализ недоступен ({aiError}). Показан базовый алгоритм.
                    </div>
                  )}

                  <div className="result-score">
                    <div className="score-circle">
                      <span className="score-num">{result.score}</span>
                    </div>
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
                          <span className={`rsh-badge ${s.status === "critical" ? "badge-crit" : s.status === "warning" ? "badge-warn" : "badge-good"}`}>
                            {s.status === "critical" ? "Критично" : s.status === "warning" ? "Улучшить" : "Хорошо"}
                          </span>
                          <span className="rsh-arrow">▼</span>
                        </div>
                        {openSections[s.id] && (
                          <div className="result-section-body">
                            {s.issues.map((issue, i) => (
                              <div key={i} className="issue-item">
                                <div className={`issue-dot ${issue.type === "critical" ? "dot-red" : issue.type === "warning" ? "dot-yellow" : "dot-green"}`} />
                                <div className="issue-text">
                                  <strong>{issue.title}</strong>
                                  {issue.description}
                                  {issue.fix && <div className="issue-fix">→ {issue.fix}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
                    <button className="btn-outline" onClick={() => { setStep(1); setResult(null); setAiError(null); }}>↺ Проверить другое резюме</button>
                    <button className="btn-lime" style={{ flex: 1 }} onClick={() => window.location.href = "/vacancies"}>Найти подходящие вакансии →</button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        <aside className="sidebar">
          <div className="side-card">
            <div className="side-card-header"><span className="side-card-icon">🤖</span><span className="side-card-title">Как работает AI</span></div>
            <div className="side-card-body">
              <div className="tip-item"><span className="tip-num">01</span>YandexGPT читает резюме и вакансию</div>
              <div className="tip-item"><span className="tip-num">02</span>Сравнивает навыки, опыт и структуру</div>
              <div className="tip-item"><span className="tip-num">03</span>Даёт конкретные советы по доработке</div>
              <div className="tip-item"><span className="tip-num">04</span>Результат сохраняется в кабинете</div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
