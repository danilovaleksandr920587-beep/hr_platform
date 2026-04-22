export type AnalysisIssue = {
  type: "good" | "warning" | "critical";
  title: string;
  description: string;
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
  savedAt?: number;
};

const STORAGE_KEY = "careerlab-resume-analysis";

export function saveResumeAnalysis(result: ResumeAnalysisResult, scope?: string | null) {
  if (typeof window === "undefined") return;
  const key = scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY;
  localStorage.setItem(key, JSON.stringify({ ...result, savedAt: Date.now() }));
}

export function loadResumeAnalysis(scope?: string | null): ResumeAnalysisResult | null {
  if (typeof window === "undefined") return null;
  const key = scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ResumeAnalysisResult;
  } catch {
    return null;
  }
}
