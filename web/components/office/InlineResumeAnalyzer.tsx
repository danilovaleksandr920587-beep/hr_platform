"use client";

import { useRef, useState, useEffect } from "react";
import {
  saveResumeAnalysis,
  loadResumeAnalysis,
  loadResumeHistory,
  formatAnalysisDate,
} from "@/lib/client/resume-analysis";
import type { ResumeAnalysisResult } from "@/lib/client/resume-analysis";

const LEVELS = ["Стажёр", "Junior", "Middle", "Senior"];
const ROLES = ["Автоопределение", "Маркетинг", "Аналитика", "Frontend", "Product", "Другая роль"];

function scoreLocal(resume: string, level: string): ResumeAnalysisResult {
  const hasNumbers = /\d/.test(resume);
  const hasExperience = /опыт|experience|стаж|project|проект/i.test(resume);
  const hasStructure = /навыки|skills|образование|education|опыт|experience/i.test(resume);
  let score = 40 + (hasNumbers ? 15 : 0) + (hasExperience ? 15 : 0) + (hasStructure ? 15 : 0);
  score = Math.max(20, Math.min(score, 85));
  return {
    score,
    verdict: "Базовая оценка — ИИ-анализ временно недоступен, попробуйте ещё раз.",
    expectedSkills: [],
    sections: [
      { id: "skills", title: "Ключевые навыки", icon: "🎯", status: "warning", issues: [{ type: "warning", kind: "problem", title: "ИИ-анализ недоступен", description: "Используется базовая оценка. Попробуйте снова через несколько секунд.", whyItMatters: "Без ИИ-разбора рекомендации менее персонализированы.", impact: "medium", confidence: "high" }] },
      { id: "experience", title: "Опыт и достижения", icon: "💼", status: hasExperience ? "good" : "warning", issues: [{ type: hasExperience ? "good" : "warning", kind: hasExperience ? "strength" : "problem", title: hasExperience ? "Опыт присутствует" : "Добавьте описание опыта", description: hasExperience ? "В резюме есть раздел с опытом или проектами." : "Не найдено описание опыта или проектов.", whyItMatters: hasExperience ? "Наличие опыта повышает доверие рекрутера." : "Без конкретного опыта сложнее пройти первичный скрининг.", rewrite: hasExperience ? undefined : "Добавьте 2-3 пункта: задача → действия → результат.", impact: hasExperience ? "medium" : "high", confidence: "high" }] },
      { id: "fit", title: "Позиционирование", icon: "🏆", status: "warning", issues: [{ type: "warning", kind: "problem", title: "Требует анализа ИИ", description: "Оценка позиционирования доступна только через ИИ-анализ.", impact: "medium", confidence: "high" }] },
      { id: "structure", title: "Структура резюме", icon: "📋", status: hasStructure ? "good" : "warning", issues: [{ type: hasStructure ? "good" : "warning", kind: hasStructure ? "strength" : "problem", title: hasStructure ? "Структура читаема" : "Нет стандартных секций", description: hasStructure ? "Есть основные разделы резюме." : "Добавьте секции: Навыки, Опыт, Образование.", whyItMatters: hasStructure ? "Структурный документ проще читать рекрутеру." : "Без секций ATS может хуже распознать документ.", rewrite: hasStructure ? undefined : "Добавьте секции: Навыки / Опыт / Образование.", impact: hasStructure ? "low" : "high", confidence: "high" }] },
    ],
    topActions: ["Добавьте конкретные результаты с цифрами", "Укажите ключевые навыки для целевой роли", "Структурируйте резюме: Навыки / Опыт / Образование"],
    mode: "general",
    targetInfo: `Уровень: ${level}`,
  };
}

type Props = { userScope: string; onScoreChange?: (score: number | null) => void };

export function InlineResumeAnalyzer({ userScope, onScoreChange }: Props) {
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showTextarea, setShowTextarea] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [level, setLevel] = useState("Junior");
  const [targetRole, setTargetRole] = useState("Автоопределение");

  const [analyzing, setAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [panel, setPanel] = useState<"form" | "result">("form");

  const [history, setHistory] = useState<ResumeAnalysisResult[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<ResumeAnalysisResult | null>(null);

  useEffect(() => {
    const latest = loadResumeAnalysis(userScope);
    const hist = loadResumeHistory(userScope);
    const timer = window.setTimeout(() => {
      if (latest) {
        setResult(latest);
        setPanel("result");
        onScoreChange?.(latest.score);
      }
      setHistory(hist);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [userScope, onScoreChange]);

  async function onFile(file: File | null) {
    if (!file) return;
    setFileError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    setResumeFileName(file.name);

    if (ext === "txt") {
      const reader = new FileReader();
      reader.onload = () => { setResumeText(String(reader.result ?? "")); };
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
        setFileError(data.error ?? "Не удалось прочитать файл — попробуйте вставить текст вручную");
        setResumeFileName("");
        setShowTextarea(true);
      } else {
        setResumeText(data.text);
      }
    } catch {
      setFileError("Ошибка загрузки — вставьте текст вручную");
      setResumeFileName("");
      setShowTextarea(true);
    } finally {
      setFileLoading(false);
    }
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave() { setDragOver(false); }
  function handleDrop(e: React.DragEvent) { e.preventDefault(); setDragOver(false); void onFile(e.dataTransfer.files?.[0] ?? null); }

  const LOADING_STEPS = ["Читаю резюме...", "Определяю роль и анализирую...", "Формирую рекомендации..."];

  async function analyze() {
    setAnalyzing(true);
    setAiError(null);
    setLoadingStep(0);
    const t1 = setTimeout(() => setLoadingStep(1), 1500);
    const t2 = setTimeout(() => setLoadingStep(2), 4000);

    let finalResult: ResumeAnalysisResult;
    try {
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "general", resumeText, autoDetect: targetRole === "Автоопределение", targetLevel: level, targetRole }),
        signal: AbortSignal.timeout(55_000),
      });
      const data = (await res.json()) as { result?: ResumeAnalysisResult; error?: string };
      if (!res.ok || !data.result) {
        setAiError(data.error ?? "ИИ недоступен");
        finalResult = scoreLocal(resumeText, level);
      } else {
        finalResult = { ...data.result, mode: "general" };
      }
    } catch {
      setAiError("Не удалось связаться с сервером");
      finalResult = scoreLocal(resumeText, level);
    }

    clearTimeout(t1);
    clearTimeout(t2);
    saveResumeAnalysis(finalResult, userScope);
    setResult(finalResult);
    setHistory(loadResumeHistory(userScope));
    setPanel("result");
    setAnalyzing(false);
    setHistoryDetail(null);
    onScoreChange?.(finalResult.score);
  }

  const canAnalyze = resumeText.trim().length >= 100;

  // History detail view
  if (historyDetail) {
    return (
      <div className="ranalyzer inline-analyzer">
        <button type="button" className="ia-back-btn" onClick={() => { setHistoryDetail(null); setHistoryOpen(true); }}>
          ← История анализов
        </button>
        <AnalysisDetail result={historyDetail} onReAnalyze={() => { setHistoryDetail(null); setPanel("form"); }} />
      </div>
    );
  }

  return (
    <div className="ranalyzer inline-analyzer">
      {/* History */}
      {history.length > 0 && (
        <div className="ia-history-bar">
          <button type="button" className="ia-history-toggle" onClick={() => setHistoryOpen((v) => !v)}>
            <span>🕑 История анализов ({history.length})</span>
            <span>{historyOpen ? "▲" : "▼"}</span>
          </button>
          {historyOpen && (
            <div className="ia-history-list">
              {history.map((entry, i) => (
                <div
                  key={entry.id ?? i}
                  className="ia-history-entry"
                  onClick={() => { setHistoryDetail(entry); setHistoryOpen(false); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setHistoryDetail(entry)}
                >
                  <div className="ia-he-left">
                    <span className="ia-he-score" style={{ color: entry.score >= 70 ? "#3a7d00" : entry.score >= 45 ? "#7a5a00" : "#b00" }}>{entry.score}</span>
                    <div>
                      <div className="ia-he-role">{entry.targetInfo ?? "Оценка резюме"}</div>
                      <div className="ia-he-date">{formatAnalysisDate(entry.savedAt)}</div>
                    </div>
                  </div>
                  <span className="ia-he-arrow">→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {panel === "result" && result && !analyzing && (
        <>
          {aiError && (
            <div style={{ padding: "8px 14px", background: "#fff4d6", borderRadius: 10, fontSize: 12, color: "#7a5a00", marginBottom: 12 }}>
              ⚠ {aiError}. Показана базовая оценка.
            </div>
          )}
          <AnalysisDetail result={result} onReAnalyze={() => { setPanel("form"); setResumeText(""); setResumeFileName(""); setFileError(null); }} />
        </>
      )}

      {/* Loading */}
      {analyzing && (
        <div className="loading-state" style={{ padding: "36px 24px" }}>
          <div className="loader" />
          <div className="loading-title" style={{ fontSize: 15 }}>Анализирую резюме...</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>{LOADING_STEPS[loadingStep]}</div>
        </div>
      )}

      {/* Form */}
      {panel === "form" && !analyzing && (
        <div>
          {/* Level pills */}
          <div style={{ marginBottom: 16 }}>
            <div className="ia-selector-label" style={{ marginBottom: 8 }}>Ваш уровень</div>
            <div className="ia-level-pills">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`ia-level-pill${level === l ? " active" : ""}`}
                  onClick={() => setLevel(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="ia-selector-label" style={{ marginBottom: 8 }}>Целевая роль</div>
            <div className="ia-level-pills">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`ia-level-pill${targetRole === r ? " active" : ""}`}
                  onClick={() => setTargetRole(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Upload zone */}
          {!showTextarea ? (
            <>
              <div
                className={`upload-zone ia-upload${resumeFileName && !fileError ? " has-file" : ""}${dragOver ? " drag-over" : ""}`}
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
                  accept=".pdf,.docx,.txt"
                  style={{ display: "none" }}
                  onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
                />
                {fileLoading ? (
                  <>
                    <div className="upload-icon" style={{ fontSize: 28 }}>⏳</div>
                    <div className="upload-title">Читаю файл...</div>
                  </>
                ) : resumeFileName && resumeText && !fileError ? (
                  <>
                    <div className="upload-icon" style={{ fontSize: 28 }}>✅</div>
                    <div className="upload-title" style={{ color: "#3a7000" }}>{resumeFileName}</div>
                    <div className="upload-sub">{resumeText.length} символов извлечено · нажмите чтобы заменить</div>
                  </>
                ) : (
                  <>
                    <div className="upload-icon" style={{ fontSize: 28 }}>📄</div>
                    <div className="upload-title">{dragOver ? "Отпустите файл" : "Перетащите или нажмите для загрузки"}</div>
                    <div className="upload-sub">PDF, DOCX, TXT · до 5 МБ</div>
                  </>
                )}
                {fileError && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#c0392b", background: "#ffe5e0", borderRadius: 6, padding: "6px 12px" }}>{fileError}</div>
                )}
              </div>
              <button
                type="button"
                className="ia-text-toggle"
                onClick={() => setShowTextarea(true)}
              >
                ✏️ Вставить текст резюме вручную
              </button>
            </>
          ) : (
            <>
              <textarea
                className="resume-textarea"
                style={{ minHeight: 180, fontSize: 13, resize: "none", width: "100%", boxSizing: "border-box" }}
                placeholder="Вставьте полный текст резюме..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
              {resumeText.length > 0 && (
                <div style={{ fontSize: 11, color: resumeText.length >= 100 ? "#4a7000" : "var(--muted)", marginTop: 4 }}>
                  {resumeText.length} символов {resumeText.length < 100 ? `· нужно ещё ${100 - resumeText.length}` : "· готово"}
                </div>
              )}
              <button type="button" className="ia-text-toggle" onClick={() => { setShowTextarea(false); setResumeText(""); }}>
                📄 Загрузить файл вместо текста
              </button>
            </>
          )}

          <button
            type="button"
            className="ia-analyze-btn"
            disabled={!canAnalyze}
            onClick={() => void analyze()}
          >
            {canAnalyze ? "Проанализировать резюме" : resumeText.length > 0 ? `Нужно ещё ${100 - resumeText.trim().length} символов` : "Загрузите или вставьте резюме"}
          </button>

          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
            ИИ оценит резюме под выбранную цель и покажет доказуемые рекомендации
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analysis Detail ───────────────────────────────────────────────────────────
function AnalysisDetail({ result, onReAnalyze }: { result: ResumeAnalysisResult; onReAnalyze: () => void }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ skills: true });
  const [showExpected, setShowExpected] = useState(true);

  const scoreColor = result.score >= 70 ? "#2d6a00" : result.score >= 45 ? "#7a5a00" : "#c0392b";

  return (
    <div className="ia-result-wrap">
      {/* Score card */}
      <div className="result-score">
        <div className="ia-score-circle" style={{ borderColor: `${scoreColor}40` }}>
          <span className="score-num" style={{ color: "#fff" }}>{result.score}</span>
          <span className="ia-score-max">/100</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ia-score-label">{result.targetInfo ?? "Оценка резюме"}</div>
          <div className="score-sub" style={{ marginTop: 4 }}>{result.verdict}</div>
          {result.savedAt && <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 4 }}>{formatAnalysisDate(result.savedAt)}</div>}
        </div>
      </div>

      {/* Expected skills */}
      {result.expectedSkills && result.expectedSkills.length > 0 && (
        <div className="ia-expected-block">
          <button type="button" className="ia-expected-toggle" onClick={() => setShowExpected((v) => !v)}>
            <span>🎓 Что ищут рекрутёры на этой роли</span>
            <span style={{ fontSize: 10 }}>{showExpected ? "▲" : "▼"}</span>
          </button>
          {showExpected && (
            <>
              <div style={{ fontSize: 11, color: "#4a7000", padding: "0 14px 8px", opacity: 0.8 }}>
                Навыки и инструменты, которые HR будет проверять в резюме
              </div>
              <div className="ia-expected-list">
                {result.expectedSkills.map((skill, i) => (
                  <span key={i} className="ia-expected-tag">
                    <span className="ia-expected-num">{i + 1}</span>{skill}
                  </span>
                ))}
              </div>
            </>
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
              <span className="rsh-arrow">{openSections[s.id] ? "▲" : "▼"}</span>
            </div>
            {openSections[s.id] && (
              <div className="result-section-body">
                {s.issues.length === 0 ? (
                  <div className="issue-item">
                    <div className="issue-dot dot-green" />
                    <div className="issue-text">Замечаний нет — раздел в хорошем состоянии.</div>
                  </div>
                ) : s.issues.map((issue, i) => (
                  <div key={i} className="issue-item">
                    <div className={`issue-dot ${issue.type === "critical" ? "dot-red" : issue.type === "warning" ? "dot-yellow" : "dot-green"}`} />
                    <div className="issue-text">
                      <strong>{issue.title}</strong>
                      {issue.description}
                      {issue.evidence && <div className="issue-fix">Доказательство: {issue.evidence}</div>}
                      {issue.whyItMatters && <div className="issue-fix">Почему важно: {issue.whyItMatters}</div>}
                      {(issue.rewrite || issue.fix) && <div className="issue-fix">Как переписать: {issue.rewrite || issue.fix}</div>}
                      {issue.questionToCandidate && <div className="issue-fix">Что уточнить: {issue.questionToCandidate}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Top actions */}
      {result.topActions && result.topActions.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Топ-3 действия прямо сейчас</div>
          <div className="vacancy-box">
            {result.topActions.map((a, i) => (
              <div key={i} className="tip-item">
                <span className="tip-num">{String(i + 1).padStart(2, "0")}</span>{a}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-analyze */}
      <button type="button" className="ia-analyze-btn" style={{ marginTop: 16 }} onClick={onReAnalyze}>
        Оценить другое резюме
      </button>
    </div>
  );
}
