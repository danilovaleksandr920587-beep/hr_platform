// Короткое превью описания вакансии для карточек списка.
// Считается на СЕРВЕРЕ (app/vacancies/page.tsx): полные description и
// description_blocks не должны попадать в пропсы клиентских компонентов -
// иначе весь текст каждой вакансии дублируется в HTML и RSC-payload
// (страница /vacancies весила 3.6 МБ).

const DESCRIPTION_PREVIEW_MAX = 180;

// Заголовки секций которые не несут смысла в превью
const SECTION_HEADERS_RE =
  /^(о компании|чем предстоит заниматься|что мы ждем|обязанности|требования|условия|задачи|о роли|о вакансии|что нужно делать)[:\s]*/im;

export function vacancyDescriptionPreview(
  text: string | null | undefined,
  blocks?: { kind: string; body: string | null; items?: string[] }[] | null,
): string | null {
  // 1. Берём body первого содержательного блока из description_blocks
  if (Array.isArray(blocks) && blocks.length > 0) {
    for (const block of blocks) {
      const body = block.body?.trim();
      if (body && body.length > 40) {
        const clean = body.replace(/\s+/g, " ").trim();
        if (clean.length <= DESCRIPTION_PREVIEW_MAX) return clean;
        return clean.slice(0, DESCRIPTION_PREVIEW_MAX - 1).trimEnd() + "…";
      }
    }
    // Если тел нет — берём первый item первого блока tasks/requirements
    for (const block of blocks) {
      if (block.kind === "tasks" || block.kind === "requirements") {
        const item = block.items?.[0]?.trim();
        if (item && item.length > 20) {
          const clean = item.replace(/\s+/g, " ").replace(/^[-–•]\s*/, "").trim();
          if (clean.length <= DESCRIPTION_PREVIEW_MAX) return clean;
          return clean.slice(0, DESCRIPTION_PREVIEW_MAX - 1).trimEnd() + "…";
        }
      }
    }
  }

  // 2. Фолбэк: description с обрезкой и удалением заголовков секций
  if (!text?.trim()) return null;
  const stripped = text.replace(SECTION_HEADERS_RE, "").replace(/\s+/g, " ").trim();
  if (!stripped || stripped.length < 20) return null;
  if (stripped.length <= DESCRIPTION_PREVIEW_MAX) return stripped;
  return stripped.slice(0, DESCRIPTION_PREVIEW_MAX - 1).trimEnd() + "…";
}
