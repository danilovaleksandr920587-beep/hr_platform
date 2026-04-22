import "server-only";
import { NextResponse } from "next/server";

const YGPT_API_KEY = process.env.YANDEX_GPT_API_KEY ?? "";
const YGPT_FOLDER_ID = process.env.YANDEX_GPT_FOLDER_ID ?? "";
const YGPT_MODEL = `gpt://${YGPT_FOLDER_ID}/yandexgpt/latest`;
const YGPT_ENDPOINT = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
const MAX_CHARS = 12000;

function isConfigured() {
  return YGPT_API_KEY.length > 10 && YGPT_FOLDER_ID.length > 5;
}

// ─── Track 2: Vacancy-specific ────────────────────────────────────────────────
const SYSTEM_PROMPT_VACANCY = `Ты — senior рекрутер и карьерный консультант с опытом найма в IT, аналитике, маркетинге и финансах.

Задача: проанализировать резюме кандидата относительно описания вакансии.

Правила:
- Отвечай ТОЛЬКО валидным JSON без markdown-обёртки
- Называй конкретные навыки и формулировки из текстов
- В каждой секции ОБЯЗАТЕЛЬНО заполни issues — минимум 1 пункт даже если статус "good": опиши что конкретно хорошо
- Давай actionable советы с примерами готовых фраз
- Оценивай честно
- Пиши по-русски

Формат ответа:
{
  "score": <0-100>,
  "verdict": "<итоговый вывод одним предложением>",
  "sections": [
    {
      "id": "skills",
      "title": "Навыки и требования",
      "icon": "🎯",
      "status": "<good|warning|critical>",
      "issues": [
        { "type": "<good|warning|critical>", "title": "<до 60 символов>", "description": "<1-3 предложения конкретики>", "fix": "<только для warning/critical>" }
      ]
    },
    { "id": "experience", "title": "Опыт и результаты", "icon": "💼", "status": "<good|warning|critical>", "issues": [...] },
    { "id": "structure", "title": "Структура и ATS", "icon": "📋", "status": "<good|warning|critical>", "issues": [...] },
    { "id": "fit", "title": "Соответствие уровню", "icon": "🏆", "status": "<good|warning|critical>", "issues": [...] }
  ],
  "topActions": ["<совет 1>", "<совет 2>", "<совет 3>"]
}`;

function buildVacancyPrompt(resumeText: string, vacancyText: string) {
  const r = resumeText.slice(0, MAX_CHARS);
  const v = vacancyText.slice(0, MAX_CHARS);
  return `Проанализируй резюме относительно вакансии.

=== РЕЗЮМЕ ===
${r}

=== ВАКАНСИЯ ===
${v}

Критерии:
1. skills — конкретные совпадения и пробелы по технологиям/навыкам из текста
2. experience — цифры, результаты, проекты
3. structure — ATS-читаемость, контакты, длина
4. fit — соответствие уровню и сфере

ВАЖНО: в каждой секции минимум 1 issue. Если всё хорошо — конкретно объясни что именно хорошо.
В topActions — 3 конкретных совета что изменить.`;
}

// ─── Track 1: General sphere-based ────────────────────────────────────────────
const SYSTEM_PROMPT_GENERAL = `Ты — senior рекрутер и карьерный консультант с глубоким опытом найма.

Задача: проанализировать резюме для желаемой роли. Определи ожидаемые навыки и оцени резюме.

Правила:
- Отвечай ТОЛЬКО валидным JSON без markdown-обёртки
- В каждой секции ОБЯЗАТЕЛЬНО заполни issues — минимум 1 пункт даже если статус "good": конкретно опиши что именно хорошо в резюме
- expectedSkills — отсортируй по важности (самые критичные навыки — первыми)
- Если содержимое резюме явно не соответствует указанной роли — укажи это в секции "fit"
- Называй конкретные инструменты, технологии, формулировки из резюме
- Пиши по-русски

Формат ответа:
{
  "score": <0-100>,
  "verdict": "<итоговый вывод одним предложением>",
  "targetInfo": "<роль из резюме или указанная роль> · <уровень>",
  "expectedSkills": [
    "<самый важный навык для этой роли>",
    "<второй по важности>",
    "... (8-12 пунктов, от важного к дополнительному)"
  ],
  "sections": [
    {
      "id": "skills",
      "title": "Навыки и стек",
      "icon": "🎯",
      "status": "<good|warning|critical>",
      "issues": [
        { "type": "<good|warning|critical>", "title": "<до 60 символов>", "description": "<конкретика из резюме, 1-3 предложения>", "fix": "<только для warning/critical>" }
      ]
    },
    { "id": "experience", "title": "Опыт и результаты", "icon": "💼", "status": "<good|warning|critical>", "issues": [...] },
    { "id": "structure", "title": "Структура и ATS", "icon": "📋", "status": "<good|warning|critical>", "issues": [...] },
    { "id": "fit", "title": "Соответствие роли", "icon": "🏆", "status": "<good|warning|critical>", "issues": [...] }
  ],
  "topActions": ["<совет 1>", "<совет 2>", "<совет 3>"]
}`;

function buildGeneralPrompt(resumeText: string, sphere: string, role: string, level: string, autoDetect: boolean) {
  const r = resumeText.slice(0, MAX_CHARS);

  if (autoDetect) {
    return `Проанализируй резюме кандидата.

Уровень кандидата (указан пользователем): ${level}

=== РЕЗЮМЕ ===
${r}

Задачи:
1. Определи из резюме на какую роль и в какой сфере нацелен кандидат. Запиши в targetInfo формат: "<Роль> · ${level}"
2. expectedSkills — 8-12 ключевых навыков для этой роли, отсортированных от самого важного к дополнительному
3. В каждой секции минимум 1 issue — если хорошо, опиши конкретно ЧТО хорошо
4. В fit — оцени соответствует ли резюме уровню ${level} для обнаруженной роли
5. topActions — 3 конкретных действия для улучшения`;
  }

  return `Проанализируй резюме кандидата для роли "${role}" (${sphere}).

Желаемая позиция: ${role}
Сфера: ${sphere}
Уровень: ${level}

=== РЕЗЮМЕ ===
${r}

Задачи:
1. targetInfo — "${role} · ${level}" (или скорректируй если резюме указывает на другую роль)
2. expectedSkills — 8-12 ключевых навыков для "${role}" уровня ${level}, отсортированных от самого критичного к желательному
3. skills — какие из ожидаемых навыков есть в резюме, чего критически не хватает
4. experience — релевантный опыт, цифры, проекты для роли "${role}"
5. structure — читаемость, ATS, контакты
6. fit — соответствует ли резюме уровню ${level}. ВАЖНО: если содержимое резюме явно указывает на другую роль или сферу — отметь это
7. В каждой секции минимум 1 issue — если хорошо, опиши конкретно ЧТО хорошо
8. topActions — 3 конкретных действия`;
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Сервис временно недоступен" }, { status: 503 });
  }

  let body: {
    resumeText?: string;
    vacancyText?: string;
    mode?: "general" | "vacancy";
    targetSphere?: string;
    targetRole?: string;
    targetLevel?: string;
    autoDetect?: boolean;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const {
    resumeText = "",
    vacancyText = "",
    mode = "vacancy",
    targetSphere = "",
    targetRole = "",
    targetLevel = "Junior",
    autoDetect = false,
  } = body;

  if (resumeText.trim().length < 30) {
    return NextResponse.json({ error: "Резюме слишком короткое" }, { status: 400 });
  }

  let systemPrompt: string;
  let userPrompt: string;

  if (mode === "general") {
    if (!autoDetect && !targetRole) {
      return NextResponse.json({ error: "Укажите желаемую роль" }, { status: 400 });
    }
    systemPrompt = SYSTEM_PROMPT_GENERAL;
    userPrompt = buildGeneralPrompt(resumeText, targetSphere, targetRole, targetLevel, autoDetect);
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
        completionOptions: { stream: false, temperature: 0.2, maxTokens: "2500" },
        messages: [
          { role: "system", text: systemPrompt },
          { role: "user", text: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("AI API error:", res.status, errText);
      return NextResponse.json({ error: `Ошибка сервиса анализа: ${res.status}` }, { status: 502 });
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

  let result: unknown;
  try {
    result = JSON.parse(cleaned);
  } catch {
    console.error("Invalid JSON from AI:", cleaned.slice(0, 500));
    return NextResponse.json({ error: "Неверный формат ответа от ИИ — попробуйте ещё раз" }, { status: 502 });
  }

  return NextResponse.json({ result, mode });
}
