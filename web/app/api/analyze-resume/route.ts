import "server-only";
import { NextResponse } from "next/server";

const YGPT_API_KEY = process.env.YANDEX_GPT_API_KEY ?? "";
const YGPT_FOLDER_ID = process.env.YANDEX_GPT_FOLDER_ID ?? "";
const YGPT_MODEL = `gpt://${YGPT_FOLDER_ID}/yandexgpt/latest`;
const YGPT_ENDPOINT = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
const MAX_CHARS = 12000;
const MIN_SECTION_ISSUES = 3;

function isConfigured() {
  return YGPT_API_KEY.length > 10 && YGPT_FOLDER_ID.length > 5;
}

type RawIssue = {
  type?: unknown;
  kind?: unknown;
  title?: unknown;
  description?: unknown;
  evidence?: unknown;
  whyItMatters?: unknown;
  rewrite?: unknown;
  questionToCandidate?: unknown;
  impact?: unknown;
  confidence?: unknown;
  fix?: unknown;
};

type RawSection = {
  id?: unknown;
  title?: unknown;
  icon?: unknown;
  status?: unknown;
  issues?: unknown;
};

type RawResult = {
  score?: unknown;
  verdict?: unknown;
  sections?: unknown;
  topActions?: unknown;
  expectedSkills?: unknown;
  targetInfo?: unknown;
};

const SECTION_META = {
  skills: { title: "Ключевые навыки", icon: "🎯" },
  experience: { title: "Опыт и достижения", icon: "💼" },
  fit: { title: "Позиционирование", icon: "🏆" },
  structure: { title: "Структура резюме", icon: "📋" },
} as const;

type SectionId = keyof typeof SECTION_META;

const SYSTEM_PROMPT_COMMON = `Ты — senior рекрутер с 10+ годами опыта найма в IT, аналитике, продукте и маркетинге.

Твоя задача — дать ПОЛЕЗНЫЙ и ДОКАЗУЕМЫЙ разбор резюме.

Критически важные правила:
- Отвечай только валидным JSON без markdown и пояснений.
- Не придумывай опыт, достижения, навыки или требования, которых нет в тексте.
- Для каждого problem обязательно дай evidence (точная цитата из текста в кавычках).
- Если данных не хватает, не выдумывай rewrite: запиши questionToCandidate.
- Разделяй strength (что реально хорошо) и problem (что мешает пройти скрининг).
- whyItMatters должен объяснять, как это влияет на рекрутера, ATS или шанс приглашения.
- rewrite должен быть коротким и копируемым, только если он честно вытекает из фактов.
- confidence показывает уверенность вывода: high/medium/low.
- impact показывает полезность исправления: high/medium/low.
- Можно оставить секцию без problem, если объективно проблем нет.
- Язык ответа: русский.`;

const RESPONSE_SCHEMA = `Формат JSON:
{
  "score": <0-100>,
  "verdict": "<1-2 предложения>",
  "targetInfo": "<роль> · <уровень>",
  "expectedSkills": ["..."],
  "sections": [
    {
      "id": "skills|experience|fit|structure",
      "title": "<название секции>",
      "icon": "<иконка>",
      "status": "good|warning|critical",
      "issues": [
        {
          "type": "good|warning|critical",
          "kind": "strength|problem",
          "title": "<до 60 символов>",
          "description": "<что именно увидел рекрутер>",
          "evidence": "<точная цитата или краткая привязка к факту>",
          "whyItMatters": "<почему это влияет на отбор>",
          "rewrite": "<готовая формулировка для резюме, если уместно>",
          "questionToCandidate": "<что уточнить у кандидата, если не хватает данных>",
          "impact": "high|medium|low",
          "confidence": "high|medium|low"
        }
      ]
    }
  ],
  "topActions": [
    "<действие: что сделать + пример формулировки>",
    "<...>",
    "<...>"
  ]
}`;

function buildVacancyPrompt(resumeText: string, vacancyText: string) {
  const r = resumeText.slice(0, MAX_CHARS);
  const v = vacancyText.slice(0, MAX_CHARS);
  return `Проанализируй резюме относительно вакансии.

=== РЕЗЮМЕ ===
${r}

=== ВАКАНСИЯ ===
${v}

Задачи:
1) Определи ключевые требования из вакансии (обязательные vs желательные).
2) Сопоставь их с резюме на основе цитат.
3) Для каждой секции дай strengths и problems только по фактам.
4) В topActions оставь 3 шага с максимальным impact.

${RESPONSE_SCHEMA}`;
}

// ─── Track 1: General / auto-detect ───────────────────────────────────────────
const SYSTEM_PROMPT_VACANCY = `${SYSTEM_PROMPT_COMMON}

Контекст: анализ резюме относительно конкретной вакансии.`;

const SYSTEM_PROMPT_GENERAL = `${SYSTEM_PROMPT_COMMON}

Контекст: анализ резюме без конкретной вакансии.`;

function buildGeneralPrompt(resumeText: string, level: string, targetRole: string) {
  const r = resumeText.slice(0, MAX_CHARS);
  return `Проанализируй резюме кандидата как опытный рекрутер.

Уровень кандидата (указан пользователем): ${level}
Целевая роль (указана пользователем): ${targetRole}

=== РЕЗЮМЕ ===
${r}

Задачи:
1) Используй targetRole как приоритетную цель. Если роль конфликтует с текстом резюме, отметь это в fit.
2) Сформируй expectedSkills (8-12) для этой роли, отсортируй по важности.
3) Дай sections c strengths/problems и evidence.
4) В topActions оставь 3 самых полезных действия с готовыми фразами.

${RESPONSE_SCHEMA}`;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

function normalizeIssue(raw: RawIssue) {
  const type = raw.type === "critical" || raw.type === "warning" || raw.type === "good" ? raw.type : "warning";
  const kind = raw.kind === "strength" || raw.kind === "problem" ? raw.kind : (type === "good" ? "strength" : "problem");
  const title = asString(raw.title) || (kind === "strength" ? "Сильная сторона" : "Точка роста");
  const description = asString(raw.description) || "Недостаточно данных для детального комментария.";
  const evidence = asString(raw.evidence);
  const whyItMatters = asString(raw.whyItMatters);
  const rewrite = asString(raw.rewrite) || asString(raw.fix);
  const questionToCandidate = asString(raw.questionToCandidate);
  const impact = raw.impact === "high" || raw.impact === "medium" || raw.impact === "low" ? raw.impact : "medium";
  const confidence = raw.confidence === "high" || raw.confidence === "medium" || raw.confidence === "low" ? raw.confidence : "medium";

  return { type, kind, title, description, evidence, whyItMatters, rewrite, questionToCandidate, impact, confidence };
}

function normalizeResult(input: RawResult, mode: "general" | "vacancy", targetLevel: string) {
  const rawScore = typeof input.score === "number" ? input.score : Number(input.score);
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 55;
  const verdict = asString(input.verdict) || "Разбор готов. Используйте рекомендации с высоким impact в первую очередь.";
  const targetInfo = asString(input.targetInfo) || `Целевая роль · ${targetLevel}`;
  const expectedSkills = asStringArray(input.expectedSkills).slice(0, 12);

  const rawSections = Array.isArray(input.sections) ? input.sections as RawSection[] : [];
  const sections: Array<{ id: string; title: string; icon: string; status: "good" | "warning" | "critical"; issues: ReturnType<typeof normalizeIssue>[] }> = [];

  for (const id of Object.keys(SECTION_META) as SectionId[]) {
    const src = rawSections.find((s) => asString(s.id) === id);
    const status = src?.status === "good" || src?.status === "warning" || src?.status === "critical" ? src.status : "warning";
    const issuesRaw = Array.isArray(src?.issues) ? src?.issues as RawIssue[] : [];
    const issues = issuesRaw.map(normalizeIssue).filter((issue) => {
      if (issue.kind === "problem") {
        return Boolean(issue.evidence || issue.questionToCandidate);
      }
      return true;
    }).slice(0, MIN_SECTION_ISSUES);

    sections.push({
      id,
      title: asString(src?.title) || SECTION_META[id].title,
      icon: asString(src?.icon) || SECTION_META[id].icon,
      status,
      issues,
    });
  }

  const topActionsFromIssues = sections
    .flatMap((section) => section.issues)
    .filter((issue) => issue.kind === "problem" && issue.impact === "high" && (issue.rewrite || issue.questionToCandidate))
    .slice(0, 3)
    .map((issue) => issue.rewrite || `Уточнить: ${issue.questionToCandidate}`);

  const topActions = (topActionsFromIssues.length ? topActionsFromIssues : asStringArray(input.topActions)).slice(0, 3);

  return {
    score,
    verdict,
    targetInfo,
    expectedSkills,
    sections,
    topActions,
    mode,
  };
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Сервис временно недоступен" }, { status: 503 });
  }

  let body: {
    resumeText?: string;
    vacancyText?: string;
    mode?: "general" | "vacancy";
    targetLevel?: string;
    targetRole?: string;
    autoDetect?: boolean;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const { resumeText = "", vacancyText = "", mode = "vacancy", targetLevel = "Junior", targetRole = "Автоопределение" } = body;

  if (resumeText.trim().length < 30) {
    return NextResponse.json({ error: "Резюме слишком короткое" }, { status: 400 });
  }

  let systemPrompt: string;
  let userPrompt: string;

  if (mode === "general") {
    systemPrompt = SYSTEM_PROMPT_GENERAL;
    userPrompt = buildGeneralPrompt(resumeText, targetLevel, targetRole);
  } else {
    if (vacancyText.trim().length < 20) {
      return NextResponse.json({ error: "Вакансия слишком короткая" }, { status: 400 });
    }
    systemPrompt = SYSTEM_PROMPT_VACANCY;
    userPrompt = buildVacancyPrompt(resumeText, vacancyText);
  }

  let raw: string;
  try {
    const res = await fetch(YGPT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Api-Key ${YGPT_API_KEY}`,
        "x-folder-id": YGPT_FOLDER_ID,
      },
      body: JSON.stringify({
        modelUri: YGPT_MODEL,
        completionOptions: { stream: false, temperature: 0.3, maxTokens: "3000" },
        messages: [
          { role: "system", text: systemPrompt },
          { role: "user", text: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(50_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("AI API error:", res.status, errText);
      return NextResponse.json({ error: `Ошибка сервиса: ${res.status}` }, { status: 502 });
    }

    const data = (await res.json()) as {
      result?: { alternatives?: Array<{ message?: { text?: string } }> };
    };
    raw = data.result?.alternatives?.[0]?.message?.text ?? "";
  } catch (err) {
    console.error("AI fetch error:", err);
    return NextResponse.json({ error: "Не удалось связаться с сервисом анализа" }, { status: 502 });
  }

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  let result: RawResult;
  try {
    result = JSON.parse(cleaned) as RawResult;
  } catch {
    console.error("Invalid JSON:", cleaned.slice(0, 500));
    return NextResponse.json({ error: "Неверный формат ответа — попробуйте ещё раз" }, { status: 502 });
  }

  const normalized = normalizeResult(result, mode, targetLevel);
  return NextResponse.json({ result: normalized, mode });
}
