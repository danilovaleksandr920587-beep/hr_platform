export type AnalysisMode = "general" | "vacancy";
export type AnalysisIssueKind = "problem" | "strength";
export type AnalysisIssueImpact = "high" | "medium" | "low";
export type AnalysisIssueConfidence = "high" | "medium" | "low";

export type AnalysisIssue = {
  type: "good" | "warning" | "critical";
  kind?: AnalysisIssueKind;
  title: string;
  description: string;
  evidence?: string;
  whyItMatters?: string;
  rewrite?: string;
  questionToCandidate?: string;
  impact?: AnalysisIssueImpact;
  confidence?: AnalysisIssueConfidence;
  fix?: string;
};

export type AnalysisSection = {
  id: string;
  title: string;
  icon: string;
  status: "good" | "warning" | "critical";
  issues: AnalysisIssue[];
};

export type ResumeAnalysisResult = {
  score: number;
  verdict: string;
  sections: AnalysisSection[];
  topActions: string[];
  expectedSkills?: string[];
  mode?: AnalysisMode;
  targetInfo?: string;
  savedAt?: number;
  id?: string;
};

const STORAGE_KEY = "careerlab-resume-analysis";
const HISTORY_KEY = "careerlab-resume-history";
const MAX_HISTORY = 15;

/**
 * Переносит гостевой анализ (нескоупленный ключ) в скоуп пользователя при
 * первом чтении после логина. Без этого результат гостя "исчезает" ровно
 * в момент конверсии - главный магнит регистрации теряет свою ценность (B-2).
 * Гостевые ключи после переноса чистим - они содержат текст резюме.
 */
function migrateGuestToScope(scope: string) {
  if (!scope) return;
  const marker = `careerlab-resume-migrated:${scope}`;
  if (localStorage.getItem(marker) === "1") return;

  const scopedLatest = `${STORAGE_KEY}:${scope}`;
  const scopedHist = `${HISTORY_KEY}:${scope}`;
  const guestLatest = localStorage.getItem(STORAGE_KEY);
  const guestHist = localStorage.getItem(HISTORY_KEY);

  if (guestLatest && !localStorage.getItem(scopedLatest)) {
    localStorage.setItem(scopedLatest, guestLatest);
  }
  if (guestHist && !localStorage.getItem(scopedHist)) {
    localStorage.setItem(scopedHist, guestHist);
  }

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(HISTORY_KEY);
  localStorage.setItem(marker, "1");
}

export function saveResumeAnalysis(result: ResumeAnalysisResult, scope?: string | null) {
  if (typeof window === "undefined") return;
  const entry: ResumeAnalysisResult = { ...result, savedAt: Date.now(), id: Date.now().toString() };

  // Save latest (for dashboard quick-load)
  const key = scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY;
  localStorage.setItem(key, JSON.stringify(entry));

  // Append to history
  const histKey = scope ? `${HISTORY_KEY}:${scope}` : HISTORY_KEY;
  let history: ResumeAnalysisResult[] = [];
  try {
    const raw = localStorage.getItem(histKey);
    if (raw) history = JSON.parse(raw) as ResumeAnalysisResult[];
  } catch { /* ignore */ }
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(histKey, JSON.stringify(history));
}

export function loadResumeAnalysis(scope?: string | null): ResumeAnalysisResult | null {
  if (typeof window === "undefined") return null;
  if (scope) migrateGuestToScope(scope);
  const key = scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ResumeAnalysisResult;
  } catch {
    return null;
  }
}

export function loadResumeHistory(scope?: string | null): ResumeAnalysisResult[] {
  if (typeof window === "undefined") return [];
  if (scope) migrateGuestToScope(scope);
  const key = scope ? `${HISTORY_KEY}:${scope}` : HISTORY_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as ResumeAnalysisResult[];
  } catch {
    return [];
  }
}

export function formatAnalysisDate(savedAt?: number): string {
  if (!savedAt) return "";
  const d = new Date(savedAt);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
