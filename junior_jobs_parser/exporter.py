"""
exporter.py — конвертирует output_vacancies.json в SQL INSERT-запросы
для загрузки вакансий прямо в Supabase (таблица public.vacancies).

Запуск:
    python3 exporter.py
    python3 exporter.py --input output_vacancies.json --output import.sql

Результат: import.sql — вставить в Supabase SQL editor или выполнить через psql.
"""

import argparse
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from urllib.parse import urlparse


# ──────────────────────────────────────────────
#  Константы схемы (enum-значения таблицы)
# ──────────────────────────────────────────────

SPHERES  = (
    "it",
    "design",
    "marketing",
    "analytics",
    "product",
    "sales",
    "support",
    "hr",
    "finance",
    "operations",
    "security",
    "devops",
    "legal",
)
EXPS     = ("none", "lt1", "1-3", "gte3")
FORMATS  = ("remote", "hybrid", "office")
TYPES    = ("internship", "project", "parttime")

_SOCIAL_APPLY_DOMAINS = (
    "t.me",
    "telegram.me",
    "vk.com",
)

_LISTING_APPLY_PATH = re.compile(
    r"(?:/vacancies/?$|/jobs/?$|/job/?$|/career/?$|/work/?$|/internship/?$|/vacancy/search/?$)",
    re.IGNORECASE,
)


# ──────────────────────────────────────────────
#  Определение sphere
# ──────────────────────────────────────────────

_SPHERE_KEYWORDS: dict[str, list[str]] = {
    "it": [
        "python", "java", "javascript", "typescript", "golang", "go ", "rust",
        "backend", "frontend", "fullstack", "devops", "qa ", "тестировщик",
        "data scientist", "machine learning", "ml ", "нейросет", "ai ", "llm",
        "ios", "android", "flutter", "kotlin", "swift", "php", "ruby",
        "разработчик", "programmer", "engineer", "инженер", "developer",
        "1с ", "sql ", "базы данных", "database", "react", "node", "docker",
        "kubernetes", "git ", "linux", "cybersec", "blockchain", "web ",
        "программист", "сервис", "микросервис", "api ", "rest ",
    ],
    "design": [
        "дизайн", "design", "figma", "ux ", "ui ", "ux/ui", "ui/ux",
        "motion", "graphis", "illustrat", "3d ", "after effects", "photoshop",
        "webflow", "sketch", "прототип", "верстальщик", "вёрстка", "верстка",
        "brand", "брендинг", "визуал",
    ],
    "marketing": [
        "маркетинг", "marketing", "smm", "seo", "serm", "контент", "content",
        "копирайт", "copywrite", "таргет", "target", "реклама", "advert",
        "pr ", "email", "рассылк", "growth", "cjm", "crm ", "performance",
        "affiliate", "influence", "блогер",
    ],
    "analytics": [
        "аналитик", "analyst", "аналитика", "analytics", "bi ", "tableau",
        "power bi", "excel", "финансов", "finance", "financial", "econom",
        "бухгалтер", "accountant", "статистик", "statistic", "data analyst",
        "продуктовый аналитик", "бизнес-аналитик", "бизнес аналитик",
    ],
    "product": [
        "product manager", "product owner", "продукт", "продакт",
        "управление продуктом", "roadmap", "custdev",
    ],
    "sales": [
        "sales", "продаж", "account executive", "business development",
        "sdr", "bdr", "аккаунт-менеджер", "менеджер по работе с клиентами",
    ],
    "support": [
        "support", "поддержк", "customer success", "success manager",
        "service desk", "техподдерж", "helpdesk",
    ],
    "hr": [
        "hr", "recruiter", "рекрутер", "talent acquisition",
        "people partner", "hrbp", "human resources",
    ],
    "finance": [
        "finance", "финанс", "fp&a", "финансовый контролер",
        "казначей", "бюджетирован", "бухгалтер",
    ],
    "operations": [
        "operations", "операци", "логист", "supply chain", "procurement",
        "закуп", "координатор", "warehouse",
    ],
    "security": [
        "security", "инфобез", "кибербез", "soc", "siem", "pentest",
        "appsec", "blue team", "red team",
    ],
    "devops": [
        "devops", "sre", "platform engineer", "инфраструктур",
        "kubernetes", "terraform", "ci/cd", "ansible",
    ],
    "legal": [
        "legal", "юрист", "compliance", "gdpr", "договор", "правов",
    ],
}


def detect_sphere(text: str) -> str:
    lower = text.lower()
    scores: dict[str, int] = {s: 0 for s in SPHERES}
    for sphere, keywords in _SPHERE_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                scores[sphere] += 1
    best = max(scores, key=lambda s: scores[s])
    return best if scores[best] > 0 else "it"


# ──────────────────────────────────────────────
#  Определение exp
# ──────────────────────────────────────────────

def detect_exp(text: str) -> str:
    lower = text.lower()
    if any(kw in lower for kw in [
        "без опыта", "no experience", "0 лет", "стажёр", "стажер",
        "стажировка", "intern", "не требует", "без требован",
    ]):
        return "none"
    if any(kw in lower for kw in [
        "junior", "джуниор", "джун", "до 1 года", "менее года",
        "less than 1", "от 6 месяц", "1 год опыт", "1 year",
    ]):
        return "lt1"
    if any(kw in lower for kw in [
        "1-3 года", "от 1 до 3", "1–3 года", "middle", "мидл",
        "2 года", "3 года", "2-3 года", "2–3 года",
    ]):
        return "1-3"
    if any(kw in lower for kw in [
        "senior", "сеньор", "от 3 лет", "3+ лет", "gte3", "lead",
    ]):
        return "gte3"
    return "lt1"


# ──────────────────────────────────────────────
#  Определение format
# ──────────────────────────────────────────────

def detect_format(text: str) -> str:
    lower = text.lower()
    if any(kw in lower for kw in [
        "удалённо", "удаленно", "remote", "дистанцион", "из любой точки",
        "из дома", "work from home", "wfh",
    ]):
        return "remote"
    if any(kw in lower for kw in [
        "гибрид", "hybrid", "частично", "2-3 дня в офис",
    ]):
        return "hybrid"
    return "office"


# ──────────────────────────────────────────────
#  Определение type
# ──────────────────────────────────────────────

def detect_type(text: str) -> str:
    lower = text.lower()
    if any(kw in lower for kw in [
        "стажировка", "стажёр", "стажер", "intern", "практик",
    ]):
        return "internship"
    if any(kw in lower for kw in [
        "подработка", "part-time", "частичная занятость", "неполный день",
        "неполная занятость", "подработ",
    ]):
        return "parttime"
    if any(kw in lower for kw in [
        "проект", "project", "фриланс", "freelance", "разовый",
        "проектная работа",
    ]):
        return "project"
    return "project"


# ──────────────────────────────────────────────
#  Извлечение зарплаты
# ──────────────────────────────────────────────

_RE_SALARY_NUM = re.compile(
    r"(\d[\d\s]{1,6})\s*(?:000)?\s*(?:₽|руб\.?|rub)?",
    re.IGNORECASE,
)


def parse_salary(salary_str: str | None) -> tuple[int | None, int | None]:
    if not salary_str:
        return None, None
    nums = []
    for m in _RE_SALARY_NUM.finditer(salary_str):
        raw = re.sub(r"\s", "", m.group(1))
        try:
            val = int(raw)
            # Нормализуем: если число похоже на тысячи (< 1000), умножаем
            if val < 1000:
                val *= 1000
            if 5_000 <= val <= 999_999:
                nums.append(val)
        except ValueError:
            pass
    if not nums:
        return None, None
    if len(nums) == 1:
        return nums[0], nums[0]
    return min(nums), max(nums)


# ──────────────────────────────────────────────
#  Генерация slug
# ──────────────────────────────────────────────

_TRANSLIT = str.maketrans(
    "абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
    "abvgdeejzijklmnoprstufhccssyyeyuaabvgdeejzijklmnoprstufhccssyyeyua",
)

_used_slugs: set[str] = set()


def make_slug(title: str, company: str) -> str:
    raw = f"{title}-{company}"
    raw = raw.lower().translate(_TRANSLIT)
    raw = unicodedata.normalize("NFD", raw)
    raw = "".join(c for c in raw if unicodedata.category(c) != "Mn")
    raw = re.sub(r"[^a-z0-9]+", "-", raw)
    raw = raw.strip("-")[:80]

    slug = raw
    counter = 2
    while slug in _used_slugs:
        slug = f"{raw}-{counter}"
        counter += 1
    _used_slugs.add(slug)
    return slug


# ──────────────────────────────────────────────
#  Очистка текста описания
# ──────────────────────────────────────────────

_RE_EMOJI = re.compile(
    "[\U00010000-\U0010ffff"
    "\U0001F300-\U0001F9FF"
    "\u2600-\u26FF\u2700-\u27BF]+",
    flags=re.UNICODE,
)
_RE_BOLD_MD  = re.compile(r"\*\*(.*?)\*\*")
_RE_MD_LINKS = re.compile(r"\[([^\]]+)\]\([^\)]+\)")


def clean_description(text: str) -> str:
    text = _RE_BOLD_MD.sub(r"\1", text)
    text = _RE_MD_LINKS.sub(r"\1", text)
    text = _RE_EMOJI.sub("", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def sanitize_apply_url(url: str | None) -> str | None:
    """Оставляет только реальные apply-URL; соцсети и листинги сбрасывает в null."""
    if not url:
        return None
    candidate = url.strip()
    if not candidate:
        return None
    try:
        parsed = urlparse(candidate)
    except Exception:
        return None
    domain = parsed.netloc.lower().replace("www.", "")
    path = parsed.path or "/"
    if any(domain == d or domain.endswith("." + d) for d in _SOCIAL_APPLY_DOMAINS):
        return None
    if _LISTING_APPLY_PATH.search(path):
        return None
    return candidate


# ──────────────────────────────────────────────
#  Определение названия вакансии
# ──────────────────────────────────────────────

_VACANCY_TITLE_PATTERNS = [
    re.compile(r"(?:вакансия|vacancy|позиция|position|роль|role)\s*:?\s*(.+)", re.IGNORECASE),
    re.compile(r"(?:ищем|нужен|требуется|открыта вакансия)\s+(.+)", re.IGNORECASE),
]


def extract_title(text: str, fallback: str) -> str:
    for line in text.splitlines()[:5]:
        line = line.strip()
        for pat in _VACANCY_TITLE_PATTERNS:
            m = pat.search(line)
            if m:
                t = m.group(1).strip().rstrip(".,:;")
                if 5 < len(t) < 120:
                    return t
    # Первая непустая строка, длиной до 120 символов
    for line in text.splitlines()[:3]:
        line = clean_description(line).strip()
        if 5 < len(line) < 120:
            return line
    return fallback[:120] if fallback else "Вакансия"


# ──────────────────────────────────────────────
#  SQL-утилиты
# ──────────────────────────────────────────────

def sql_str(value: str | None) -> str:
    if value is None:
        return "null"
    escaped = value.replace("'", "''")
    return f"'{escaped}'"


def sql_int(value: int | None) -> str:
    return "null" if value is None else str(value)


def sql_bool(value: bool) -> str:
    return "true" if value else "false"


# ──────────────────────────────────────────────
#  Конвертация одной вакансии
# ──────────────────────────────────────────────

def convert_vacancy(v: dict) -> dict:
    raw_text  = v.get("text") or v.get("description", "")
    title_raw = v.get("title", "")
    company   = v.get("company", v.get("source", "—"))

    if isinstance(title_raw, str) and 5 < len(title_raw.strip()) < 180:
        title = title_raw.strip()
    else:
        title = extract_title(raw_text, title_raw)
    desc    = clean_description(raw_text)
    sphere  = v.get("sphere") or detect_sphere(raw_text)
    exp     = v.get("exp") or detect_exp(raw_text)
    fmt     = v.get("format") or detect_format(raw_text)
    vtype   = v.get("employment_type") or v.get("type") or detect_type(raw_text)
    sal_min, sal_max = parse_salary(v.get("salary"))
    slug    = make_slug(title, company)

    contacts = v.get("contacts", {})
    apply_url = v.get("apply_url") or ""
    if not apply_url:
        links = contacts.get("apply_links", []) or contacts.get("trusted_links", [])
        apply_url = links[0] if links else ""
    apply_url = sanitize_apply_url(apply_url)

    return {
        "slug":            slug,
        "title":           title,
        "company":         company,
        "company_about":   v.get("company_about"),
        "city":            v.get("city"),
        "skills":          v.get("skills") if isinstance(v.get("skills"), list) else [],
        "source_published_at": v.get("source_published_at"),
        "company_logo_url": v.get("company_logo_url"),
        "description":     desc,
        "sphere":          sphere,
        "exp":             exp,
        "format":          fmt,
        "employment_type": vtype,
        "salary_min":      sal_min,
        "salary_max":      sal_max,
        "apply_url":       apply_url,
        "bonus_tags":      [],
        "is_featured":     False,
        "is_published":    True,
        "published_at":    datetime.now(timezone.utc).isoformat(),
    }


# ──────────────────────────────────────────────
#  Генерация SQL
# ──────────────────────────────────────────────

def to_sql(rows: list[dict]) -> str:
    lines = [
        "-- Импорт вакансий из парсера",
        f"-- Сгенерировано: {datetime.now().strftime('%d.%m.%Y %H:%M')}",
        f"-- Количество вакансий: {len(rows)}",
        "",
        "insert into public.vacancies",
        "  (slug, title, company, company_about, city, skills, source_published_at, company_logo_url, description, sphere, exp, format, employment_type,",
        "   salary_min, salary_max, apply_url, bonus_tags,",
        "   is_featured, is_published, published_at)",
        "values",
    ]

    value_blocks = []
    for r in rows:
        block = (
            f"  ({sql_str(r['slug'])}, {sql_str(r['title'])}, {sql_str(r['company'])}, {sql_str(r.get('company_about'))}, {sql_str(r.get('city'))},\n"
            f"   {sql_str('{' + ','.join((r.get('skills') or [])) + '}')}, {sql_str(r.get('source_published_at'))}, {sql_str(r.get('company_logo_url'))},\n"
            f"   {sql_str(r['description'])},\n"
            f"   {sql_str(r['sphere'])}, {sql_str(r['exp'])}, {sql_str(r['format'])}, {sql_str(r['employment_type'])},\n"
            f"   {sql_int(r['salary_min'])}, {sql_int(r['salary_max'])},\n"
            f"   {sql_str(r['apply_url'])},\n"
            f"   '{{}}',\n"
            f"   {sql_bool(r['is_featured'])}, {sql_bool(r['is_published'])},\n"
            f"   {sql_str(r['published_at'])})"
        )
        value_blocks.append(block)

    lines.append(",\n".join(value_blocks))
    lines.append("on conflict (slug) do update set")
    lines.append("  title           = excluded.title,")
    lines.append("  company         = excluded.company,")
    lines.append("  company_about   = excluded.company_about,")
    lines.append("  city            = excluded.city,")
    lines.append("  skills          = excluded.skills,")
    lines.append("  source_published_at = excluded.source_published_at,")
    lines.append("  company_logo_url = excluded.company_logo_url,")
    lines.append("  description     = excluded.description,")
    lines.append("  sphere          = excluded.sphere,")
    lines.append("  exp             = excluded.exp,")
    lines.append("  format          = excluded.format,")
    lines.append("  employment_type = excluded.employment_type,")
    lines.append("  salary_min      = excluded.salary_min,")
    lines.append("  salary_max      = excluded.salary_max,")
    lines.append("  apply_url       = excluded.apply_url,")
    lines.append("  is_published    = excluded.is_published,")
    lines.append("  published_at    = excluded.published_at;")
    lines.append("")

    return "\n".join(lines)


# ──────────────────────────────────────────────
#  main
# ──────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Конвертер вакансий → SQL для Supabase")
    ap.add_argument("--input",  default="output_vacancies.json", help="Входной JSON")
    ap.add_argument("--output", default="import.sql",            help="Выходной SQL")
    ap.add_argument("--limit",  type=int, default=0,             help="Ограничение на кол-во вакансий (0 = все)")
    args = ap.parse_args()

    if not os.path.exists(args.input):
        print(f"Файл {args.input} не найден. Сначала запустите python3 main.py")
        sys.exit(1)

    with open(args.input, encoding="utf-8") as f:
        vacancies = json.load(f)

    if args.limit > 0:
        vacancies = vacancies[:args.limit]

    print(f"Конвертирую {len(vacancies)} вакансий...")
    rows = [convert_vacancy(v) for v in vacancies]

    sql = to_sql(rows)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(sql)

    # Статистика
    spheres  = {s: sum(1 for r in rows if r["sphere"] == s)           for s in SPHERES}
    formats  = {f: sum(1 for r in rows if r["format"] == f)           for f in FORMATS}
    types    = {t: sum(1 for r in rows if r["employment_type"] == t)  for t in TYPES}
    with_url = sum(1 for r in rows if r["apply_url"])
    with_sal = sum(1 for r in rows if r["salary_min"])

    print(f"\n✓ SQL сохранён → {args.output}")
    print(f"  Вакансий:         {len(rows)}")
    print(f"  С apply_url:      {with_url}")
    print(f"  С зарплатой:      {with_sal}")
    print(f"  Сферы:            {spheres}")
    print(f"  Форматы:          {formats}")
    print(f"  Типы:             {types}")
    print(f"\nДалее: вставьте содержимое {args.output} в Supabase SQL Editor")


if __name__ == "__main__":
    main()
