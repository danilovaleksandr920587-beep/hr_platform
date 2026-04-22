"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  saveResumeAnalysis,
  loadResumeAnalysis,
  loadResumeHistory,
  formatAnalysisDate,
} from "@/lib/client/resume-analysis";
import type { ResumeAnalysisResult, AnalysisSection } from "@/lib/client/resume-analysis";

const SPHERES = [
  {
    label: "IT / Разработка",
    roles: [
      "Frontend-разработчик",
      "Backend-разработчик",
      "Fullstack-разработчик",
      "DevOps-инженер",
      "Mobile-разработчик (iOS)",
      "Mobile-разработчик (Android)",
    ],
  },
  {
    label: "Данные / Аналитика",
    roles: ["Продуктовый аналитик", "Data Scientist", "Data Engineer", "BI-аналитик", "Системный аналитик"],
  },
  {
    label: "Продукт",
    roles: ["Product Manager", "Product Owner", "Business Analyst"],
  },
  {
    label: "Дизайн",
    roles: ["UX/UI-дизайнер", "Графический дизайнер"],
  },
  {
    label: "Маркетинг",
    roles: ["Digital-маркетолог", "SMM-специалист", "SEO-специалист", "Performance-маркетолог", "Контент-маркетолог"],
  },
  {
    label: "Финансы",
    roles: ["Финансовый аналитик", "Экономист", "Бухгалтер", "Финансовый менеджер"],
  },
  {
    label: "Управление / HR",
    roles: ["Project Manager", "Team Lead", "HR-менеджер", "Рекрутер"],
  },
  {
    label: "QA",
    roles: ["QA-инженер (ручное)", "QA Automation Engineer"],
  },
];

const LEVELS = ["Стажёр", "Junior", "Middle", "Senior"];

function scoreLocal(resume: string, sphere: string, role: string, level: string): ResumeAnalysisResult {
  const r = resume.toLowerCase();
  const hasNumbers = /\d/.test(resume);
  const hasExperience = /опыт|experience|стаж|project|проект/i.test(resume);
  const hasStructure = /навыки|skills|образование|education|опыт|experience/i.test(resume);

  let score = 40 + (hasNumbers ? 15 : 0) + (hasExperience ? 15 : 0) + (hasStructure ? 15 : 0);
  score = Math.max(20, Math.min(score, 85));

  return {
    score,
    verdict: score >= 60 ? "Резюме имеет хорошую базу, есть точки роста." : "Резюме требует доработки для целевой роли.",
    expectedSkills: ["Не удалось получить список от AI — попробуйте ещё раз"],
    sections: [
      {
        id: "skills", title: "Навыки и стек", icon: "🎯",
        status: "warning",
        issues: [{ type: "warning", title: "AI-анализ недоступен", description: "Используется базовая оценка. Подключитесь к интернету и попробуйте снова." }],
      },
      {
        id: "experience", title: "Опыт и результаты", icon: "💼",
        status: hasExperience ? "good" : "warning",
        issues: [{ type: hasExperience ? "good" : "warning", title: hasExperience ? "Опыт присутствует" : "Добавьте описание опыта", description: hasExperience ? "В резюме есть раздел с опытом." : "Нет информации об опыте или проектах." }],
      },
      {
        id: "structure", title: "Структура и ATS", icon: "📋",
        status: hasStructure ? "good" : "warning",
        issues: [{ type: hasStructure ? "good" : "warning", title: hasStructure ? "Структура читаема" : "Нет стандартных секций", description: hasStructure ? "Есть основные разделы резюме." : "Добавьте секции: Навыки, Опыт, Образование." }],
      },
      {
        id: "fit", title: "Соответствие роли", icon: "🏆",
        status: "warning",
        issues: [{ type: "warning", title: `Анализ для роли ${role}`, description: "Детальная оценка соответствия недоступна в офлайн-режиме." }],
      },
    ],
    topActions: ["Убедитесь, что в резюме есть конкретные результаты с цифрами", "Добавьте ключевые навыки для выбранной роли", "Структурируйте резюме по разделам: Навыки / Опыт / Образование"],
    mode: "general",
    targetInfo: `${role} · ${level}`,
  };
}

type Props = {
  userScope: string;
  onScoreChange?: (score: number | null) => void;
};

export function InlineResumeAnalyzer({ userScope, onScoreChange }: Props) {
  // File / text state
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Role selectors
  const [sphere, setSphere] = useState(SPHERES[0].label);
  const [role, setRole] = useState(SPHERES[0].roles[0]);
  const [level, setLevel] = useState("Junior");

  // When sphere changes — reset role to first of that sphere
  const sphereRoles = SPHERES.find((s) => s.label === sphere)?.roles ?? [];

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ skills: true });

  // History
  const [history, setHistory] = useState<ResumeAnalysisResult[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<ResumeAnalysisResult | null>(null);

  // Panel state: "form" | "result"
  const [panel, setPanel] = useState<"form" | "result">("form");

  // Load on mount
  useEffect(() => {
    const latest = loadResumeAnalysis(userScope);
    const hist = loadResumeHistory(userScope);
    if (latest) {
      setResult(latest);
      setPanel("result");
      onScoreChange?.(latest.score);
    }
    setHistory(hist);
  }, [userScope, onScoreChange]);

  const handleSphereChange = useCallback((newSphere: string) => {
    setSphere(newSphere);
    const roles = SPHERES.find((s) => s.label === newSphere)?.roles ?? [];
    setRole(roles[0] ?? "");
  }, []);

  async function onFile(file: File | null) {
    if (!file) return;
    setFileError(null);
    setResumeFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (ext === "txt") {
      const reader = new FileReader();
      reader.onload = () => setResumeText(String(reader.result ?? ""));
      reader.readAsText(file);
      return;
    }

    setFileLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-resume", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setFileError(data.error ?? "Не удалось прочитать файл");
        setResumeFileName("");
      } else {
        setResumeText(data.text);
      }
    } catch {
      setFileError("Ошибка при загрузке файла");
      setResumeFileName("");
    } finally {
      setFileLoading(false);
    }
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave() { setDragOver(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    void onFile(e.dataTransfer.files?.[0] ?? null);
  }

  const LOADING_STEPS = ["Читаю резюме...", "Анализирую для роли...", "Формирую рекомендации..."];

  async function analyze() {
    setAnalyzing(true);
    setAiError(null);
    setLoadingStep(0);
    const t1 = setTimeout(() => setLoadingStep(1), 1200);
    const t2 = setTimeout(() => setLoadingStep(2), 3000);

    let finalResult: ResumeAnalysisResult;
    const targetInfo = `${role} · ${level}`;

    try {
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "general",
          resumeText,
          targetSphere: sphere,
          targetRole: role,
          targetLevel: level,
        }),
        signal: AbortSignal.timeout(50_000),
      });

      const data = (await res.json()) as { result?: ResumeAnalysisResult; error?: string };

      if (!res.ok || !data.result) {
        setAiError(data.error ?? "AI недоступен");
        finalResult = scoreLocal(resumeText, sphere, role, level);
      } else {
        finalResult = { ...data.result, mode: "general", targetInfo };
      }
    } catch {
      setAiError("Не удалось связаться с сервером");
      finalResult = scoreLocal(resumeText, sphere, role, level);
    }

    clearTimeout(t1);
    clearTimeout(t2);
    saveResumeAnalysis(finalResult, userScope);
    setResult(finalResult);
    setHistory(loadResumeHistory(userScope));
    setPanel("result");
    setAnalyzing(false);
    onScoreChange?.(finalResult.score);
  }

  const canAnalyze = resumeText.trim().length >= 50 && role.length > 0;

  return (
    <div className="ranalyzer inline-analyzer">
      {/* ── History bar ── */}
      {history.length > 0 && (
        <div className="ia-history-bar">
          <button
            type="button"
            className="ia-history-toggle"
            onClick={() => { setHistoryOpen((v) => !v); setHistoryDetail(null); }}
          >
            🕑 История анализов ({history.length}) {historyOpen ? "▲" : "▼"}
          </button>
          {historyOpen && (
            <div className="ia-history-list">
              {historyDetail ? (
                <div>
                  <button type="button" className="ia-history-back" onClick={() => setHistoryDetail(null)}>← Назад</button>
                  <AnalysisDetail result={historyDetail} onReAnalyze={() => { setPanel("form"); setHistoryOpen(false); setHistoryDetail(null); }} />
                </div>
              ) : (
                history.map((entry, i) => (
                  <div key={entry.id ?? i} className="ia-history-entry" onClick={() => setHistoryDetail(entry)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setHistoryDetail(entry)}>
                    <div className="ia-he-left">
                      <span className="ia-he-score" style={{ color: entry.score >= 70 ? "#3a7d00" : entry.score >= 45 ? "#7a5a00" : "#b00" }}>{entry.score}</span>
                      <div>
                        <div className="ia-he-role">{entry.targetInfo ?? (entry.mode === "general" ? "Общая оценка" : "Под вакансию")}</div>
                        <div className="ia-he-date">{formatAnalysisDate(entry.savedAt)}</div>
                      </div>
                    </div>
                    <span className="ia-he-arrow">→</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Result panel ── */}
      {panel === "result" && result && !analyzing && (
        <div>
          {aiError && (
            <div style={{ padding: "8px 14px", background: "#fff4d6", borderRadius: 10, fontSize: 12, color: "#7a5a00", marginBottom: 16 }}>
              ⚠ AI недоступен ({aiError}). Показана базовая оценка.
            </div>
          )}
          <AnalysisDetail result={result} onReAnalyze={() => setPanel("form")} />
        </div>
      )}

      {/* ── Loading ── */}
      {analyzing && (
        <div className="loading-state">
          <div className="loader" />
          <div className="loading-title">Анализирую резюме...</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>{LOADING_STEPS[loadingStep]}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, opacity: 0.6 }}>Powered by YandexGPT</div>
        </div>
      )}

      {/* ── Form panel ── */}
      {panel === "form" && !analyzing && (
        <div>
          {/* Role selectors */}
          <div className="ia-role-selectors">
            <div className="ia-selector-group">
              <label className="ia-selector-label">Сфера</label>
              <select className="form-select" value={sphere} onChange={(e) => handleSphereChange(e.target.value)}>
                {SPHERES.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
              </select>
            </div>
            <div className="ia-selector-group">
              <label className="ia-selector-label">Роль</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                {sphereRoles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="ia-selector-group">
              <label className="ia-selector-label">Уровень</label>
              <select className="form-select" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Resume input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, marginTop: 16 }}>
            <button
              type="button"
              className="btn-outline"
              style={{ flex: 1, fontSize: 13, padding: "8px 12px", borderColor: inputMode === "file" ? "var(--dark)" : undefined, color: inputMode === "file" ? "var(--dark)" : undefined }}
              onClick={() => setInputMode("file")}
            >
              📄 Загрузить файл
            </button>
            <button
              type="button"
              className="btn-outline"
              style={{ flex: 1, fontSize: 13, padding: "8px 12px", borderColor: inputMode === "text" ? "var(--dark)" : undefined, color: inputMode === "text" ? "var(--dark)" : undefined }}
              onClick={() => setInputMode("text")}
            >
              ✏️ Вставить текст
            </button>
          </div>

          {inputMode === "file" ? (
            <div
              className={`upload-zone${resumeFileName ? " has-file" : ""}${dragOver ? " drag-over" : ""}`}
              style={{ minHeight: 120 }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: "none" }}
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
              <div className="upload-icon" style={{ fontSize: 24 }}>📋</div>
              <div className="upload-title" style={{ fontSize: 14 }}>{dragOver ? "Отпустите файл" : "Перетащите резюме"}</div>
              <div className="upload-sub" style={{ fontSize: 12 }}>PDF, DOCX, TXT · до 5 МБ</div>
              {fileLoading && <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>⏳ Читаю файл...</div>}
              {resumeFileName && !fileLoading && (
                <div className="file-preview"><span className="file-icon">📄</span><span className="file-name">{resumeFileName}</span></div>
              )}
              {fileError && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#c0392b", background: "#ffe5e0", borderRadius: 6, padding: "4px 10px" }}>{fileError}</div>
              )}
            </div>
          ) : (
            <textarea
              className="resume-textarea"
              style={{ minHeight: 140, fontSize: 13 }}
              placeholder="Вставьте текст резюме..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          )}

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%" }}
              disabled={!canAnalyze}
              onClick={() => void analyze()}
            >
              Проанализировать резюме ✦
            </button>
          </div>
          {!canAnalyze && resumeText.length > 0 && resumeText.length < 50 && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, textAlign: "center" }}>Резюме слишком короткое</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Analysis Detail sub-component ────────────────────────────────────────────
function AnalysisDetail({ result, onReAnalyze }: { result: ResumeAnalysisResult; onReAnalyze: () => void }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ skills: true });
  const [showExpected, setShowExpected] = useState(true);

  return (
    <>
      {/* Score */}
      <div className="result-score">
        <div className="score-circle">
          <span className="score-num">{result.score}</span>
        </div>
        <div>
          <div className="score-title">
            {result.targetInfo ? `${result.targetInfo}` : "Оценка резюме"}
          </div>
          <div className="score-sub">{result.verdict}</div>
          {result.savedAt && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{formatAnalysisDate(result.savedAt)}</div>
          )}
        </div>
      </div>

      {/* Expected skills */}
      {result.expectedSkills && result.expectedSkills.length > 0 && (
        <div className="ia-expected-block">
          <button
            type="button"
            className="ia-expected-toggle"
            onClick={() => setShowExpected((v) => !v)}
          >
            <span>🎓 Что ищут рекрутёры на этой роли</span>
            <span>{showExpected ? "▲" : "▼"}</span>
          </button>
          {showExpected && (
            <div className="ia-expected-list">
              {result.expectedSkills.map((skill, i) => (
                <span key={i} className="ia-expected-tag">{skill}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      <div className="result-sections">
        {result.sections.map((s) => (
          <div key={s.id} className={`result-section${openSections[s.id] ? " open" : ""}`}>
            <div
              className="result-section-header"
              onClick={() => setOpenSections((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
            >
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

      {/* Top Actions */}
      {result.topActions && result.topActions.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Топ-3 действия:</div>
          <div className="vacancy-box">
            {result.topActions.map((a, i) => (
              <div key={i} className="tip-item">
                <span className="tip-num">{String(i + 1).padStart(2, "0")}</span>{a}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onReAnalyze}>
          ↺ Оценить ещё раз
        </button>
      </div>
    </>
  );
}
