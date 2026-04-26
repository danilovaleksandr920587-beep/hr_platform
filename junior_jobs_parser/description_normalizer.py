from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse


SectionKind = str


@dataclass
class NormalizedBlock:
    kind: SectionKind
    title: str
    body: str | None
    items: list[str]

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "title": self.title,
            "body": self.body,
            "items": self.items,
        }


@dataclass
class NormalizedDescription:
    description: str
    description_blocks: list[dict]
    clean_text_for_filters: str
    suggested_title: str | None
    signals: dict[str, str | None]
    warnings: list[str]


_EMOJI_RE = re.compile("[\U00010000-\U0010ffff]", re.UNICODE)
_MULTISPACE_RE = re.compile(r"[ \t]+")
_MULTINEWLINE_RE = re.compile(r"\n{3,}")
_MD_HEADER_RE = re.compile(r"^#{1,6}\s*")
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_MD_BOLD_RE = re.compile(r"\*{1,3}([^*]+)\*{1,3}")
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_BULLET_RE = re.compile(r"^\s*(?:[-*•●▪◦—–►✓✔]|\d+[.)])\s+")
_GENERIC_TITLE_RE = re.compile(
    r"^(вакансии|карьера|работа)\b|в московской области|вакансии .+ в .+",
    re.IGNORECASE,
)
_EXPERIENCE_YEAR_RE = re.compile(r"(?:от|не менее)\s*(\d)\s*(?:года|лет|год)")
# Разбивает склеенные пункты: ровно 2 строчных Cyrillic/Latin перед пробелом → заглавная + 2+ строчных.
# Двухсимвольный lookbehind автоматически исключает однобуквенные предлоги (в, и, с, к…),
# которые всегда стоят после пробела и не дают двух строчных подряд прямо перед новым пробелом.
_IMPLICIT_SPLIT_RE = re.compile(r"(?<=[а-яёa-z][а-яёa-z]) (?=[А-ЯЁA-Z][а-яёa-z]{2,})")
_IMPLICIT_BULLET_SEG_RE = re.compile(r"[;•·]\s+")

_JUNK_LINE_PATTERNS = [
    r"условия использования",
    r"политика конфиденциальности",
    r"открыть в яндекс\.картах",
    r"менеджер по подбору персонала",
    r"похожие вакансии",
    r"смотреть все вакансии",
    r"выберите город",
    r"фильтр",
    r"cookie",
    r"поделиться",
    r"как откликнуться",
    r"откликнуться на вакансию",
    # навигация сайта
    r"пропустить навигацию",
    r"быстрые офферы",
    r"приведи друга",
    r"работа в ит\b",
    r"ответы на вопросы",
    r"узнать больше о профессии",
    r"подписаться на рассылку",
    r"мы в соцсетях",
    r"все вакансии компании",
    # форма отклика
    r"прикрепить резюме",
    r"отправить резюме",
    r"загрузить резюме",
    r"^описание:?$",
    r"фамилия\s+имя",
    r"eще ссылка",
    r"ещ[её]\s+ссылка",
    r"создать свою карту",
    r"пригласите друга",
    r"пригласить$",
    r"часто задаваемые вопросы",
    r"отклик на вакансию",
    r"нажимая кнопку",
    r"или прикрепить файл",
    r"узнайте больше о направлении",
    r"расскажем о всех преимуществах",
    r"посмотрите на процессы изнутри",
    r"^хорошо$",
    r"^в офисе$",
    r"^удаленно$",
    r"^удалённо$",
    r"^гибрид$",
    r"^офис$",
    r"^откликнуться$",
    r"^рекомендовать друга$",
    r"^читать$",
    r"^гайд по интервью$",
    r"^о компании$",
    r"^вакансии$",
    r"^стажировки$",
    r"^события$",
    r"^бенефиты$",
    r"^©\s*positive technologies.*$",
    r"^лидер результативной кибербезопасности$",
    r"^техническая поддержка$",
    r"@[a-z0-9._-]+\.[a-z]{2,}",
    r"\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b",
]
_JUNK_LINE_RE = re.compile("|".join(_JUNK_LINE_PATTERNS), re.IGNORECASE)
_FORM_LEAK_RE = re.compile(
    r"(\bфамилия\b|\bимя\b|\bтелефон\b|\be-?mail\b|\bпочта\b|загрузите файл|резюме|отправить|откликнуться|рекомендовать друга|гайд по интервью)",
    re.IGNORECASE,
)

_SECTION_ALIASES: dict[str, tuple[str, str]] = {
    "о компании": ("about", "О компании"),
    "about the company": ("about", "О компании"),
    "about us": ("about", "О компании"),
    "о вакансии": ("about", "О роли"),
    "о роли": ("about", "О роли"),
    "присоединяйся к команде": ("about", "О компании"),
    "чем предстоит заниматься": ("tasks", "Чем предстоит заниматься"),
    "задачи": ("tasks", "Чем предстоит заниматься"),
    "обязанности": ("tasks", "Чем предстоит заниматься"),
    "что нужно делать": ("tasks", "Чем предстоит заниматься"),
    "что предстоит делать": ("tasks", "Чем предстоит заниматься"),
    "основная задача сотрудника": ("tasks", "Чем предстоит заниматься"),
    "главная задача сотрудника": ("tasks", "Чем предстоит заниматься"),
    "основные задачи": ("tasks", "Чем предстоит заниматься"),
    "what you will do": ("tasks", "Чем предстоит заниматься"),
    "responsibilities": ("tasks", "Чем предстоит заниматься"),
    "что мы ждем": ("requirements", "Что мы ждем от тебя"),
    "что мы ждём": ("requirements", "Что мы ждем от тебя"),
    "мы ждем, что ты": ("requirements", "Что мы ждем от тебя"),
    "мы ждём, что ты": ("requirements", "Что мы ждем от тебя"),
    "кого мы ищем": ("requirements", "Что мы ждем от тебя"),
    "для нас важно": ("requirements", "Что мы ждем от тебя"),
    "находимся в поиске коллеги": ("requirements", "Что мы ждем от тебя"),
    "находимся в поиске коллеги, у которого есть": ("requirements", "Что мы ждем от тебя"),
    "требования": ("requirements", "Что мы ждем от тебя"),
    "requirements": ("requirements", "Что мы ждем от тебя"),
    "мы ожидаем": ("requirements", "Что мы ждем от тебя"),
    "наши ожидания": ("requirements", "Что мы ждем от тебя"),
    "вы должны уметь": ("requirements", "Что мы ждем от тебя"),
    "что важно": ("requirements", "Что мы ждем от тебя"),
    "мы предлагаем": ("conditions", "Условия"),
    "условия и бонусы": ("conditions", "Условия"),
    "что даем": ("conditions", "Условия"),
    "что даём": ("conditions", "Условия"),
    "условия": ("conditions", "Условия"),
    "what we offer": ("conditions", "Условия"),
    "benefits": ("conditions", "Условия"),
    "чем ты будешь заниматься": ("tasks", "Чем предстоит заниматься"),
    "что мы предлагаем": ("conditions", "Условия"),
    "плюсы работы": ("conditions", "Условия"),
    "из чего будет складываться доход": ("conditions", "Условия"),
    "почему с нами хорошо": ("conditions", "Условия"),
    "стек": ("stack", "Стек"),
    "технологии": ("stack", "Стек"),
    "tech stack": ("stack", "Стек"),
}

_COMPANY_PRESETS: dict[str, dict[str, list[str]]] = {
    "cdek": {
        "start_markers": ["чем предстоит заниматься", "обязанности", "задачи"],
        "end_markers": [
            "условия использования",
            "открыть в яндекс.картах",
            "открыть в яндекс картах",
            "создать свою карту",
            "пригласите друга",
            "часто задаваемые вопросы",
            "отклик на вакансию",
            "или прикрепить файл",
        ],
    },
    "alfa": {
        "start_markers": ["чем предстоит заниматься", "задачи", "дежурный инженер"],
        "end_markers": ["условия использования", "менеджер по подбору персонала"],
    },
    "sber": {
        "start_markers": ["о вакансии", "задачи", "чем предстоит заниматься"],
        "end_markers": ["откликнуться", "условия использования"],
    },
    "cian": {
        "start_markers": ["мы ищем", "основная задача", "задачи", "обязанности"],
        "end_markers": ["условия использования", "открыть в яндекс.картах"],
    },
    "tbank": {
        # навигация и фильтр-бар занимают верх страницы → стартуем с первого смыслового раздела
        "start_markers": ["чем предстоит заниматься", "задачи", "обязанности", "требования"],
        "end_markers": ["откликнуться", "похожие вакансии", "другие вакансии", "мы в соцсетях"],
    },
    "avito": {
        "start_markers": ["чем предстоит", "что предстоит делать", "мы ожидаем", "требования", "задачи"],
        "end_markers": ["похожие вакансии", "откликнуться", "рекомендовать друга", "форма отклика"],
    },
    "kontur": {
        "start_markers": ["задачи", "обязанности", "мы ожидаем", "требования"],
        "end_markers": ["похожие вакансии", "рекомендовать друга", "резюме или загрузите файл", "отправить"],
    },
    "lamoda": {
        "start_markers": ["чем тебе предстоит заниматься", "чем предстоит заниматься", "задачи", "требования"],
        "end_markers": ["откликайтесь", "откликнуться", "загрузите файл", "отправить"],
    },
    "kaspersky": {
        "start_markers": ["основные задачи", "задачи", "обязанности", "требования", "мы ожидаем"],
        "end_markers": ["похожие вакансии", "поделиться", "откликнуться", "форма отклика"],
    },
    "yandex": {
        "start_markers": ["задачи", "чем предстоит заниматься", "требования", "условия"],
        "end_markers": ["откликнуться", "заполнить анкету", "подать заявку"],
    },
}

_STOPLIST_COMPANY_KEYS = {"jetbrains", "cian"}


def _normalize_text(text: str) -> str:
    text = _MD_HEADER_RE.sub("", text)   # \u0443\u0431\u0438\u0440\u0430\u0435\u043c ### \u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043a\u0438
    text = _MD_LINK_RE.sub(r"\1", text)
    text = _MD_BOLD_RE.sub(r"\1", text)
    text = _HTML_TAG_RE.sub(" ", text)
    text = _EMOJI_RE.sub("", text)
    text = text.replace("\xa0", " ").replace("\u200b", "")
    text = _MULTISPACE_RE.sub(" ", text)
    text = _MULTINEWLINE_RE.sub("\n\n", text)
    return text.strip()


def _detect_company_key(source: str | None, apply_url: str | None) -> str | None:
    host = ""
    for value in (apply_url, source):
        if value:
            try:
                host = urlparse(value).netloc.lower()
            except Exception:
                host = ""
            if host:
                break
    if "cdek" in host:
        return "cdek"
    if "alfa" in host:
        return "alfa"
    if "sber" in host:
        return "sber"
    if "cian" in host:
        return "cian"
    if "tbank" in host or "tinkoff" in host:
        return "tbank"
    if "avito" in host:
        return "avito"
    if "kontur" in host:
        return "kontur"
    if "lamoda" in host:
        return "lamoda"
    if "kaspersky" in host:
        return "kaspersky"
    if "yandex" in host:
        return "yandex"
    if "jetbrains" in host or "greenhouse.io/jetbrains" in host:
        return "jetbrains"
    return None


def _extract_vacancy_window(lines: list[str], preset_key: str | None) -> list[str]:
    if not lines:
        return []
    preset = _COMPANY_PRESETS.get(preset_key or "", {})
    start_markers = [x.lower() for x in preset.get("start_markers", [])]
    end_markers = [x.lower() for x in preset.get("end_markers", [])]

    start_idx = 0
    if start_markers:
        for i, line in enumerate(lines):
            low = line.lower()
            if any(marker in low for marker in start_markers):
                start_idx = max(0, i - 1)
                break

    end_idx = len(lines)
    if end_markers:
        for i in range(start_idx, len(lines)):
            low = lines[i].lower()
            if any(marker in low for marker in end_markers):
                end_idx = i
                break
    return lines[start_idx:end_idx]


def _split_header_and_content(line: str) -> list[str]:
    """Разбивает «Заголовок: текст» на две строки, если заголовок — известный раздел.

    Нужно для Сбера и аналогичных источников, где ### после strip даёт
    «Что нужно делать: Рассматриваем кандидатов…» в одну строку.
    """
    norm = line.lower()
    for key in _SECTION_ALIASES:
        if norm.startswith(key):
            after = line[len(key):]
            stripped = after.lstrip()
            if stripped.startswith(":") or stripped.startswith("—") or stripped.startswith("-"):
                content = stripped[1:].strip()
                if content:
                    return [line[:len(key)].strip(), content]
    return [line]


def _split_inline_transition(line: str) -> list[str]:
    """Разделяет строку по встроенному смысловому переходу.

    Пример: "... Возможен удаленный формат. Для нас важно: ..."
    """
    low = line.lower()
    markers = (
        "для нас важно:",
        "для нас важно",
        "мы ждем, что ты:",
        "мы ждём, что ты:",
        "мы ожидаем, что",
        "основная задача сотрудника:",
        "главная задача сотрудника:",
        "из чего будет складываться доход:",
        "почему с нами хорошо:",
    )
    for marker in markers:
        idx = low.find(marker)
        if idx > 0:
            left = line[:idx].strip(" .")
            right = line[idx:].strip()
            out = []
            if left:
                out.append(left)
            if right:
                out.append(right)
            return out if out else [line]
    return [line]


def _clean_lines(text: str) -> list[str]:
    out: list[str] = []
    for raw in text.splitlines():
        line = _normalize_text(raw)
        if not line:
            out.append("")
            continue
        if _JUNK_LINE_RE.search(line):
            continue
        if re.match(r"^https?://", line):
            continue
        for part in _split_header_and_content(line):
            for split_part in _split_inline_transition(part):
                # Повторно прогоняем split заголовка после inline-split:
                # "... Для нас важно: X" -> ["Для нас важно", "X"]
                for final_part in _split_header_and_content(split_part):
                    out.append(final_part)
    return out


def _header_to_section(line: str) -> tuple[str, str] | None:
    normalized = line.strip().rstrip(":").lower()
    if not normalized or len(normalized) > 320:
        return None
    for key, mapped in _SECTION_ALIASES.items():
        if re.match(rf"^{re.escape(key)}(?:$|[\s:,\-—])", normalized):
            return mapped
    return None


def _split_implicit_bullets(text: str, kind: str) -> list[str] | None:
    """Разбивает склеенные пункты списка на элементы (Альфа-Банк и др., где скрапер убрал переносы).

    Короткие фрагменты (напр. «Знание» перед «Python…») объединяем со следующим пунктом,
    чтобы один короткий осколок не блокировал весь результат.
    """
    if kind not in ("tasks", "requirements", "conditions"):
        return None
    if len(text) < 100:
        return None
    raw = _IMPLICIT_SPLIT_RE.split(text)
    if len(raw) < 2:
        return None

    _MIN_FRAG = 20  # фрагмент короче — «приклеить» к следующему
    merged: list[str] = []
    pending: str | None = None
    continuation_suffixes = ("например", "включая", "с использованием", "на базе", "в том числе")
    glue_next_prefixes = (
        "intel",
        "core ",
        "amd ",
        "prometheus",
        "grafana",
        "alertmanager",
        "в москве",
        "в питере",
        "в сочи",
        "в екатеринбурге",
    )
    for part in raw:
        part = part.strip()
        if not part:
            continue
        low = part.lower()
        if merged and any(merged[-1].lower().rstrip(",.:;").endswith(s) for s in continuation_suffixes):
            merged[-1] = f"{merged[-1]} {part}"
            continue
        if merged and any(low.startswith(prefix) for prefix in glue_next_prefixes):
            merged[-1] = f"{merged[-1]} {part}"
            continue
        if pending is not None:
            part = pending + " " + part
            pending = None
        if len(part) < _MIN_FRAG:
            pending = part   # отложить, склеить вперёд
        else:
            merged.append(part)
    if pending is not None:
        if merged:
            merged[-1] = merged[-1] + " " + pending
        else:
            merged.append(pending)

    if len(merged) < 2 or any(len(p) < 8 for p in merged):
        return None
    return merged


def _looks_like_sentence_item(line: str) -> bool:
    if len(line) < 20:
        return False
    # типичный пункт: начинается с глагола/действия и не заканчивается двоеточием
    return not line.endswith(":")


def _postprocess_blocks(blocks: list[NormalizedBlock]) -> list[NormalizedBlock]:
    # 1) удалить пустые/однословные мусорные блоки
    compact: list[NormalizedBlock] = []
    trash_values = {"хорошо", "ok", "да", "нет"}
    for block in blocks:
        body = (block.body or "").strip()
        if body and _FORM_LEAK_RE.search(body) and block.kind in ("conditions", "about"):
            body = re.sub(
                r"(\bфамилия\b|\bимя\b|\bтелефон\b|\be-?mail\b|\bпочта\b|загрузите файл|резюме|отправить|откликнуться|рекомендовать друга|гайд по интервью).*",
                "",
                body,
                flags=re.IGNORECASE,
            ).strip(" .")
        items = [x.strip() for x in block.items if x.strip()]
        if body.lower() in trash_values and not items:
            continue
        if not body and not items:
            continue
        compact.append(NormalizedBlock(block.kind, block.title, body or None, items))

    # 2) склеить соседние однотипные блоки
    merged: list[NormalizedBlock] = []
    for block in compact:
        if merged and merged[-1].kind == block.kind and merged[-1].title == block.title:
            prev = merged[-1]
            body_parts = []
            if prev.body:
                body_parts.append(prev.body)
            if block.body:
                body_parts.append(block.body)
            prev.body = " ".join(body_parts).strip() or None
            prev.items.extend(block.items)
            continue
        merged.append(block)

    # 3) нормализовать порядок секций
    order = {"about": 0, "other": 1, "tasks": 2, "requirements": 3, "conditions": 4, "stack": 5}
    merged.sort(key=lambda b: order.get(b.kind, 50))
    return merged


def _semantic_split_large_about(blocks: list[NormalizedBlock]) -> list[NormalizedBlock]:
    """Fallback for sources with no explicit headings (TG, some career pages)."""
    if len(blocks) != 1 or blocks[0].kind not in ("about", "other"):
        return blocks
    about = blocks[0]
    text = (about.body or "").strip()
    if len(text) < 240:
        return blocks

    marker_map = [
        (re.compile(r"(наши ожидания|мы ожидаем|что мы ждем|требования)\s*:?", re.IGNORECASE), "requirements", "Что мы ждем от тебя"),
        (re.compile(r"(вам предстоит|основная задача|чем предстоит заниматься|задачи|обязанности)\s*:?", re.IGNORECASE), "tasks", "Чем предстоит заниматься"),
        (re.compile(r"(условия и бонусы|условия|мы предлагаем|что даем|что даём)\s*:?", re.IGNORECASE), "conditions", "Условия"),
    ]
    # find first occurrence per marker
    hits: list[tuple[int, str, str]] = []
    for rx, kind, title in marker_map:
        m = rx.search(text)
        if m:
            hits.append((m.start(), kind, title))
    if not hits:
        return blocks
    hits.sort(key=lambda x: x[0])
    segments: list[NormalizedBlock] = []
    if hits[0][0] > 10:
        intro = text[: hits[0][0]].strip(" .")
        if intro:
            segments.append(NormalizedBlock("about", "О компании", intro, []))
    for idx, (start, kind, title) in enumerate(hits):
        end = hits[idx + 1][0] if idx + 1 < len(hits) else len(text)
        chunk = text[start:end].strip()
        chunk = re.sub(r"^[^:]{2,80}:\s*", "", chunk).strip()
        if not chunk:
            continue
        parts = [p.strip() for p in _IMPLICIT_BULLET_SEG_RE.split(chunk) if p.strip()]
        if len(parts) >= 2:
            segments.append(NormalizedBlock(kind, title, None, parts))
        else:
            segments.append(NormalizedBlock(kind, title, chunk, []))
    return segments or blocks


def _semantic_split_any_about(blocks: list[NormalizedBlock]) -> list[NormalizedBlock]:
    def split_block_text(text: str) -> list[NormalizedBlock]:
        marker_map = [
            (
                re.compile(
                    r"(наши ожидания|мы ожидаем|что мы ждем|требования|находимся в поиске коллеги(?:, у которого есть)?)\s*:?",
                    re.IGNORECASE,
                ),
                "requirements",
                "Что мы ждем от тебя",
            ),
            (
                re.compile(
                    r"(вам предстоит|основная задача(?: сотрудника)?|чем предстоит заниматься|чем ты будешь заниматься|задачи|обязанности)\s*:?",
                    re.IGNORECASE,
                ),
                "tasks",
                "Чем предстоит заниматься",
            ),
            (
                re.compile(
                    r"(условия и бонусы|условия|мы предлагаем|что мы предлагаем|что даем|что даём|плюсы работы)\s*:?",
                    re.IGNORECASE,
                ),
                "conditions",
                "Условия",
            ),
        ]
        hits: list[tuple[int, int, str, str]] = []
        for rx, kind, title in marker_map:
            for m in rx.finditer(text):
                hits.append((m.start(), m.end(), kind, title))
        if len(hits) < 2:
            return []
        hits.sort(key=lambda x: x[0])
        out: list[NormalizedBlock] = []
        if hits[0][0] > 20:
            intro = text[: hits[0][0]].strip(" .")
            if intro:
                out.append(NormalizedBlock("about", "О компании", intro, []))
        for i, (_, end_pos, kind, title) in enumerate(hits):
            next_pos = hits[i + 1][0] if i + 1 < len(hits) else len(text)
            chunk = text[end_pos:next_pos].strip(" .:")
            if not chunk:
                continue
            parts = [p.strip() for p in _IMPLICIT_BULLET_SEG_RE.split(chunk) if p.strip()]
            if len(parts) >= 2:
                out.append(NormalizedBlock(kind, title, None, parts))
            else:
                out.append(NormalizedBlock(kind, title, chunk, []))
        return out

    result: list[NormalizedBlock] = []
    changed = False
    for block in blocks:
        if block.kind == "about" and block.body and len(block.body) >= 180:
            replacement = split_block_text(block.body)
            if replacement:
                result.extend(replacement)
                changed = True
                continue
        result.append(block)
    return result if changed else blocks


def _collect_quality_issues(
    blocks: list[NormalizedBlock], description_text: str, title: str | None
) -> list[str]:
    issues: list[str] = []
    kinds = [b.kind for b in blocks]
    if not blocks:
        issues.append("no_blocks")
    if "tasks" not in kinds:
        issues.append("missing_tasks")
    if "requirements" not in kinds:
        issues.append("missing_requirements")
    if kinds.count("conditions") > 1:
        issues.append("duplicate_conditions")
    if _JUNK_LINE_RE.search(description_text):
        issues.append("junk_leak")
    if _FORM_LEAK_RE.search(description_text):
        issues.append("form_leak")
    if title and _GENERIC_TITLE_RE.search(title):
        issues.append("generic_title")
    for block in blocks:
        if block.body and len(block.body.split()) > 80 and not block.items:
            issues.append("huge_body_no_items")
        for item in block.items:
            if len(item.strip()) <= 10:
                issues.append("short_item")
                break
    # stable order for output
    return sorted(set(issues))


def _to_blocks(lines: list[str], company: str | None) -> list[NormalizedBlock]:
    blocks: list[NormalizedBlock] = []
    current_kind: str | None = None
    current_title: str | None = None
    paragraph_lines: list[str] = []
    bullet_items: list[str] = []
    intro_buffer: list[str] = []

    def flush_current() -> None:
        nonlocal paragraph_lines, bullet_items, current_kind, current_title
        if current_kind is None:
            return
        body = " ".join(paragraph_lines).strip() or None
        items = [x.strip() for x in bullet_items if x.strip()]
        if body or items:
            blocks.append(
                NormalizedBlock(
                    kind=current_kind,
                    title=current_title or "О роли",
                    body=body,
                    items=items,
                )
            )
        paragraph_lines = []
        bullet_items = []

    for line in lines:
        if not line:
            continue
        header = _header_to_section(line)
        if header:
            if current_kind is None and intro_buffer:
                blocks.append(
                    NormalizedBlock("about", "О компании", " ".join(intro_buffer), [])
                )
                intro_buffer = []
            flush_current()
            current_kind, current_title = header
            continue

        bullet_match = _BULLET_RE.match(line)
        if current_kind is None:
            intro_buffer.append(line)
            continue
        if bullet_match:
            bullet_items.append(_BULLET_RE.sub("", line).strip())
        else:
            header = _header_to_section(line)
            if header:
                flush_current()
                current_kind, current_title = header
                continue
            implicit = _split_implicit_bullets(line, current_kind)
            if implicit:
                bullet_items.extend(implicit)
            else:
                if current_kind in ("tasks", "requirements", "conditions") and _looks_like_sentence_item(line):
                    bullet_items.append(line)
                else:
                    paragraph_lines.append(line)

    if current_kind is None and intro_buffer:
        title = "О компании" if company else "О роли"
        blocks.append(NormalizedBlock("about", title, " ".join(intro_buffer), []))
    else:
        flush_current()
    return _postprocess_blocks(blocks)


def _render_fallback(blocks: list[NormalizedBlock]) -> str:
    parts: list[str] = []
    for block in blocks:
        lines: list[str] = [block.title]
        if block.body:
            lines.append(block.body)
        lines.extend(f"- {item}" for item in block.items)
        parts.append("\n".join(lines).strip())
    return "\n\n".join(part for part in parts if part).strip()


def _suggest_title(existing_title: str | None, clean_text: str) -> str | None:
    if existing_title and not _GENERIC_TITLE_RE.search(existing_title):
        return None
    for line in clean_text.splitlines():
        candidate = line.strip()
        if 8 <= len(candidate) <= 120 and not _JUNK_LINE_RE.search(candidate):
            if not _GENERIC_TITLE_RE.search(candidate.lower()):
                return candidate
    return None


def _detect_signals(text: str) -> dict[str, str | None]:
    low = text.lower()

    exp: str | None = None
    if any(w in low for w in ("без опыта", "опыт не требуется", "стажер", "стажёр", "internship")):
        exp = "none"
    elif "6 месяцев" in low or "до 1 года" in low or "junior" in low:
        exp = "lt1"
    else:
        year_match = _EXPERIENCE_YEAR_RE.search(low)
        if year_match:
            years = int(year_match.group(1))
            if years <= 1:
                exp = "lt1"
            elif years <= 3:
                exp = "1-3"
            else:
                exp = "gte3"

    fmt: str | None = None
    if "гибрид" in low or "hybrid" in low:
        fmt = "hybrid"
    elif any(w in low for w in ("удаленно", "удалённо", "remote")):
        fmt = "remote"
    elif any(w in low for w in ("офис", "office", "on-site", "onsite")):
        fmt = "office"

    employment_type: str | None = None
    if any(w in low for w in ("стажировка", "internship", "intern")):
        employment_type = "internship"
    elif any(w in low for w in ("part-time", "частичная занятость", "неполный")):
        employment_type = "parttime"
    elif any(w in low for w in ("проектная работа", "freelance", "контракт")):
        employment_type = "project"

    return {
        "exp": exp,
        "format": fmt,
        "employment_type": employment_type,
    }


def normalize_description(
    *,
    raw_text: str,
    title: str | None = None,
    company: str | None = None,
    source: str | None = None,
    apply_url: str | None = None,
) -> NormalizedDescription:
    cleaned_lines = _clean_lines(raw_text)
    preset_key = _detect_company_key(source, apply_url)
    use_preset = preset_key not in _STOPLIST_COMPANY_KEYS
    vacancy_lines = _extract_vacancy_window(cleaned_lines, preset_key if use_preset else None)
    blocks = _to_blocks(vacancy_lines, company)
    blocks = _semantic_split_any_about(blocks)
    blocks = _semantic_split_large_about(blocks)
    if not blocks:
        blocks = [NormalizedBlock("other", "О роли", _normalize_text(raw_text), [])]
    fallback = _render_fallback(blocks)
    clean_text = "\n".join(vacancy_lines).strip() or _normalize_text(raw_text)
    signals = _detect_signals(clean_text)
    suggested_title = _suggest_title(title, clean_text)
    warnings: list[str] = _collect_quality_issues(blocks, fallback, title)
    if suggested_title:
        warnings.append("title_replaced_by_content")
    if preset_key in _STOPLIST_COMPANY_KEYS:
        warnings.append("stoplist_company")
    warnings = sorted(set(warnings))
    return NormalizedDescription(
        description=fallback,
        description_blocks=[block.to_dict() for block in blocks],
        clean_text_for_filters=clean_text,
        suggested_title=suggested_title,
        signals=signals,
        warnings=warnings,
    )

