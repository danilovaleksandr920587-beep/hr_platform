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
const SYSTEM_PROMPT_VACANCY = `Ты — senior рекрутер с 10+ годами опыта найма в IT, продукте, аналитике, маркетинге.

Задача: детально проанализировать резюме относительно вакансии и дать конкретные инсайты.

Правила:
- Отвечай ТОЛЬКО валидным JSON без markdown-обёртки
- Цитируй конкретные фразы из резюме и вакансии в кавычках
- В каждой секции ОБЯЗАТЕЛЬНО минимум 1 issue — если хорошо, конкретно объясни ЧТО хорошо и почему это сильная сторона
- Давай инсайты рекрутера: что думает HR читая это резюме, что вызывает сомнения, что привлекает
- Fix — конкретная готовая формулировка, которую можно скопировать в резюме
- Оценивай честно, не завышай score
- Пиши по-русски

Формат ответа:
{
  "score": <0-100>,
  "verdict": "<честный итоговый вывод 1-2 предложения>",
  "sections": [
    {
      "id": "skills",
      "title": "Ключевые навыки",
      "icon": "🎯",
      "status": "<good|warning|critical>",
      "issues": [
        {
          "type": "<good|warning|critical>",
          "title": "<конкретный заголовок до 60 символов>",
          "description": "<инсайт рекрутера: что видит HR, почему это важно, конкретные детали из текстов>",
          "fix": "<готовая формулировка для резюме — только для warning/critical>"
        }
      ]
    },
    { "id": "experience", "title": "Опыт и достижения", "icon": "💼", "status": "...", "issues": [...] },
    { "id": "fit", "title": "Позиционирование", "icon": "🏆", "status": "...", "issues": [...] },
    { "id": "structure", "title": "Структура резюме", "icon": "📋", "status": "...", "issues": [...] }
  ],
  "topActions": ["<конкретное действие с примером готовой фразы>", "...", "..."]
}`;

function buildVacancyPrompt(resumeText: string, vacancyText: string) {
  const r = resumeText.slice(0, MAX_CHARS);
  const v = vacancyText.slice(0, MAX_CHARS);
  return `Проанализируй резюме относительно вакансии как опытный рекрутер.

=== РЕЗЮМЕ ===
${r}

=== ВАКАНСИЯ ===
${v}

Дай глубокий анализ по 4 секциям:
1. skills (Ключевые навыки) — сравни навыки из резюме с требованиями вакансии, цитируй конкретные пункты
2. experience (Опыт и достижения) — есть ли измеримые результаты? что думает рекрутер видя этот опыт?
3. fit (Позиционирование) — насколько очевидно из резюме что человек хочет и подходит для ЭТОЙ роли?
4. structure (Структура резюме) — ATS, форматирование, логика подачи информации

В каждой секции минимум 1 issue. Если хорошо — напиши что конкретно сильно и почему.
topActions: 3 самых важных действия прямо сейчас.`;
}

// ─── Track 1: General / auto-detect ───────────────────────────────────────────
const SYSTEM_PROMPT_GENERAL = `Ты — senior рекрутер с 10+ годами опыта найма в разных сферах.

Задача: определить целевую роль кандидата из резюме, составить список ожидаемых навыков и дать глубокий анализ резюме.

Правила:
- Отвечай ТОЛЬКО валидным JSON без markdown-обёртки
- Цитируй конкретные фразы и данные из резюме
- В каждой секции ОБЯЗАТЕЛЬНО минимум 1 issue — если хорошо, объясни ЧТО именно сильно и почему это конкурентное преимущество
- expectedSkills — навыки которые рекрутёры ИЩУТ для обнаруженной роли, отсортированные от критически важных к желательным
- Давай инсайты рекрутера: что привлекает, что вызывает сомнения, как резюме воспринимается при первом просмотре (6-10 секунд)
- fix — конкретная готовая формулировка, которую можно скопировать в резюме
- Пиши по-русски

Формат ответа:
{
  "score": <0-100>,
  "verdict": "<честный итоговый вывод 1-2 предложения>",
  "targetInfo": "<определённая роль> · <уровень>",
  "expectedSkills": [
    "<критически важный навык #1 для этой роли>",
    "<критически важный навык #2>",
    "... (8-12 пунктов от обязательных к желательным)"
  ],
  "sections": [
    {
      "id": "skills",
      "title": "Ключевые навыки",
      "icon": "🎯",
      "status": "<good|warning|critical>",
      "issues": [
        {
          "type": "<good|warning|critical>",
          "title": "<конкретный заголовок до 60 символов>",
          "description": "<инсайт рекрутера с конкретикой из резюме: что видит HR, что думает, почему это важно для данной роли>",
          "fix": "<готовая формулировка для резюме — только для warning/critical>"
        }
      ]
    },
    { "id": "experience", "title": "Опыт и достижения", "icon": "💼", "status": "...", "issues": [...] },
    { "id": "fit", "title": "Позиционирование", "icon": "🏆", "status": "...", "issues": [...] },
    { "id": "structure", "title": "Структура резюме", "icon": "📋", "status": "...", "issues": [...] }
  ],
  "topActions": [
    "<конкретное действие #1 с готовой формулировкой>",
    "<конкретное действие #2>",
    "<конкретное действие #3>"
  ]
}`;

function buildGeneralPrompt(resumeText: string, level: string) {
  const r = resumeText.slice(0, MAX_CHARS);
  return `Проанализируй резюме кандидата как опытный рекрутер.

Уровень кандидата (указан пользователем): ${level}

=== РЕЗЮМЕ ===
${r}

Задачи:
1. Определи из резюме целевую роль и сферу кандидата → запиши в targetInfo: "<Роль> · ${level}"
2. expectedSkills: 8-12 навыков которые рекрутёры ИЩУТ для этой роли, от критически важных к желательным
3. Секция "Ключевые навыки": какие навыки для этой роли есть в резюме? чего критически не хватает? цитируй из резюме
4. Секция "Опыт и достижения": есть ли измеримые результаты? конкретные проекты? что думает рекрутер читая этот блок?
5. Секция "Позиционирование": насколько чётко резюме позиционирует кандидата для этой роли? понятно ли за 10 секунд кто это и чего хочет?
6. Секция "Структура резюме": ATS, логика подачи, форматирование, читаемость
7. В каждой секции минимум 1 issue с конкретным инсайтом рекрутера. Если хорошо — объясни почему это сильная сторона.
8. topActions: 3 самых важных действия с готовыми формулировками для резюме`;
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
    autoDetect?: boolean;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const { resumeText = "", vacancyText = "", mode = "vacancy", targetLevel = "Junior" } = body;

  if (resumeText.trim().length < 30) {
    return NextResponse.json({ error: "Резюме слишком короткое" }, { status: 400 });
  }

  let systemPrompt: string;
  let userPrompt: string;

  if (mode === "general") {
    systemPrompt = SYSTEM_PROMPT_GENERAL;
    userPrompt = buildGeneralPrompt(resumeText, targetLevel);
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

  let result: unknown;
  try {
    result = JSON.parse(cleaned);
  } catch {
    console.error("Invalid JSON:", cleaned.slice(0, 500));
    return NextResponse.json({ error: "Неверный формат ответа — попробуйте ещё раз" }, { status: 502 });
  }

  return NextResponse.json({ result, mode });
}
