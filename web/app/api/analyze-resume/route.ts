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

Твоя задача: проанализировать резюме кандидата относительно описания вакансии и вернуть структурированную оценку.

Правила:
- Отвечай ТОЛЬКО валидным JSON без markdown-обёртки, без пояснений вне JSON
- Называй конкретные навыки, инструменты и формулировки из текстов — не обобщай
- Давай actionable советы с примерами готовых фраз
- Оценивай честно: score отражает реальное соответствие, не округляй до круглых цифр
- Пиши по-русски

Формат ответа (строго):
{
  "score": <целое число 0-100>,
  "verdict": "<одно предложение — итоговый вывод>",
  "sections": [
    {
      "id": "skills",
      "title": "Навыки и требования",
      "icon": "🎯",
      "status": "<good|warning|critical>",
      "issues": [
        {
          "type": "<good|warning|critical>",
          "title": "<краткий заголовок до 60 символов>",
          "description": "<конкретика из текста, 1-3 предложения>",
          "fix": "<готовая формулировка или конкретное действие — только для warning и critical>"
        }
      ]
    },
    {
      "id": "experience",
      "title": "Опыт и результаты",
      "icon": "💼",
      "status": "<good|warning|critical>",
      "issues": [...]
    },
    {
      "id": "structure",
      "title": "Структура и ATS",
      "icon": "📋",
      "status": "<good|warning|critical>",
      "issues": [...]
    },
    {
      "id": "fit",
      "title": "Соответствие уровню",
      "icon": "🏆",
      "status": "<good|warning|critical>",
      "issues": [...]
    }
  ],
  "topActions": [
    "<конкретное действие с примером>",
    "<конкретное действие с примером>",
    "<конкретное действие с примером>"
  ]
}`;

function buildVacancyPrompt(resumeText: string, vacancyText: string) {
  const r = resumeText.slice(0, MAX_CHARS);
  const v = vacancyText.slice(0, MAX_CHARS);
  return `Проанализируй резюме кандидата относительно вакансии.

=== РЕЗЮМЕ ===
${r}

=== ВАКАНСИЯ ===
${v}

Оцени по четырём критериям:
1. skills — перечисли совпадающие и недостающие технологии/навыки явно из текста
2. experience — есть ли цифры, результаты, конкретные проекты? что добавить?
3. structure — структура, ATS-читаемость, контакты, длина
4. fit — соответствие уровню и сфере (джуниор/мидл, сфера деятельности)

В topActions дай 3 конкретных совета: что именно написать или добавить.`;
}

// ─── Track 1: General sphere-based ────────────────────────────────────────────
const SYSTEM_PROMPT_GENERAL = `Ты — senior рекрутер и карьерный консультант с опытом найма в IT, аналитике, маркетинге, финансах и других сферах.

Твоя задача: проанализировать резюме кандидата с учётом желаемой роли и сферы деятельности. Оцени качество резюме и составь список навыков, которые рекрутёры ОЖИДАЮТ увидеть на этой позиции.

Правила:
- Отвечай ТОЛЬКО валидным JSON без markdown-обёртки, без пояснений вне JSON
- Называй конкретные навыки, инструменты и формулировки из резюме — не обобщай
- Давай actionable советы с примерами готовых фраз
- В expectedSkills перечисли именно то, что рекрутёры будут искать в резюме кандидата на эту роль
- Оценивай честно: score отражает реальное качество резюме для данной роли
- Пиши по-русски

Формат ответа (строго):
{
  "score": <целое число 0-100>,
  "verdict": "<одно предложение — итоговый вывод>",
  "expectedSkills": [
    "<навык, технология или инструмент, который рекрутёры ожидают для этой роли>",
    "... (всего 8-12 пунктов)"
  ],
  "sections": [
    {
      "id": "skills",
      "title": "Навыки и стек",
      "icon": "🎯",
      "status": "<good|warning|critical>",
      "issues": [
        {
          "type": "<good|warning|critical>",
          "title": "<краткий заголовок до 60 символов>",
          "description": "<конкретика из резюме, 1-3 предложения>",
          "fix": "<готовая формулировка или конкретное действие — только для warning и critical>"
        }
      ]
    },
    {
      "id": "experience",
      "title": "Опыт и результаты",
      "icon": "💼",
      "status": "<good|warning|critical>",
      "issues": [...]
    },
    {
      "id": "structure",
      "title": "Структура и ATS",
      "icon": "📋",
      "status": "<good|warning|critical>",
      "issues": [...]
    },
    {
      "id": "fit",
      "title": "Соответствие роли",
      "icon": "🏆",
      "status": "<good|warning|critical>",
      "issues": [...]
    }
  ],
  "topActions": [
    "<конкретное действие с примером>",
    "<конкретное действие с примером>",
    "<конкретное действие с примером>"
  ]
}`;

function buildGeneralPrompt(resumeText: string, sphere: string, role: string, level: string) {
  const r = resumeText.slice(0, MAX_CHARS);
  return `Проанализируй резюме кандидата для желаемой роли.

Желаемая позиция: ${role}
Сфера: ${sphere}
Уровень: ${level}

=== РЕЗЮМЕ ===
${r}

Задачи:
1. expectedSkills — перечисли 8-12 ключевых навыков/инструментов, которые рекрутёры БУДУТ ИСКАТЬ в резюме кандидата на роль "${role}" уровня ${level} в сфере "${sphere}". Конкретные технологии, методологии, инструменты — то, что HR ожидает увидеть.
2. skills — какие из ожидаемых навыков есть в резюме, чего критически не хватает
3. experience — есть ли релевантный опыт, проекты, цифры для роли "${role}"
4. structure — читаемость, ATS-совместимость, наличие контактов
5. fit — насколько содержание резюме соответствует уровню ${level} для роли "${role}"

topActions: 3 конкретных совета что изменить прямо сейчас, чтобы резюме лучше подходило под эту роль.`;
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "YandexGPT не настроен. Добавьте YANDEX_GPT_API_KEY и YANDEX_GPT_FOLDER_ID в .env.local" },
      { status: 503 }
    );
  }

  let body: {
    resumeText?: string;
    vacancyText?: string;
    mode?: "general" | "vacancy";
    targetSphere?: string;
    targetRole?: string;
    targetLevel?: string;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const { resumeText = "", vacancyText = "", mode = "vacancy", targetSphere = "", targetRole = "", targetLevel = "" } = body;

  if (resumeText.trim().length < 30) {
    return NextResponse.json({ error: "Резюме слишком короткое" }, { status: 400 });
  }

  let systemPrompt: string;
  let userPrompt: string;

  if (mode === "general") {
    if (!targetRole || !targetSphere) {
      return NextResponse.json({ error: "Укажите желаемую роль и сферу" }, { status: 400 });
    }
    systemPrompt = SYSTEM_PROMPT_GENERAL;
    userPrompt = buildGeneralPrompt(resumeText, targetSphere, targetRole, targetLevel || "Junior");
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
        completionOptions: {
          stream: false,
          temperature: 0.2,
          maxTokens: "2500",
        },
        messages: [
          { role: "system", text: systemPrompt },
          { role: "user", text: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("YandexGPT error:", res.status, errText);
      return NextResponse.json(
        { error: `YandexGPT вернул ошибку ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      result?: { alternatives?: Array<{ message?: { text?: string } }> };
    };
    raw = data.result?.alternatives?.[0]?.message?.text ?? "";
  } catch (err) {
    console.error("YandexGPT fetch error:", err);
    return NextResponse.json({ error: "Не удалось связаться с YandexGPT" }, { status: 502 });
  }

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  let result: unknown;
  try {
    result = JSON.parse(cleaned);
  } catch {
    console.error("YandexGPT returned invalid JSON:", cleaned.slice(0, 500));
    return NextResponse.json({ error: "ИИ вернул неверный формат — попробуйте ещё раз" }, { status: 502 });
  }

  return NextResponse.json({ result, mode });
}
