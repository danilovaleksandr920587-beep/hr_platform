"""
Process raw_posts.json → cleaned vacancies ready for Supabase import.

Output: processed_vacancies.json  — array of vacancy objects matching the DB schema
        rejected_posts.json       — discarded posts with rejection reason (for review)
"""

import json
import re
import uuid
import hashlib
from datetime import datetime, timezone

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

SKIP_AGGREGATORS = ["geekjob.ru", "hh.ru", "korenovsk.hh.ru", "rabota.hh.ru"]
# facancy.ru, youngjunior.ru, finder.work — acceptable (specific job pages, not giant aggregators)

SPAM_KEYWORDS = [
    "регистрир", "эфир", "вебинар", "практикум", "подборка вакансий",
    "подборка стажировок", "pgon", "fabrikaklon", "бесплатный доступ",
    "neural-university", "заработ", "партнёр", "реферальн", "млм", "сетевой",
    "amazon flex", "uber", "doordash", "instacart", "вывод крипт",
    "ии-контент-комбинат", "ai-агент", "подпишись", "подписаться",
    "смотри бесплатный", "пообщаться", "встречу?", "мнения?",
    "курсовую от руки", "спасти отдел", "чек-лист",
    "для любимых подписчиков", "давайте вместе решим",
]

NON_JOB_PATTERNS = [
    r"^[^\w]*[🔥📣🎉🎊✅❗⭐]\s*(получите|бесплатный|встречаемся|этичный хакер|ex-cto)",
    r"^\s*[📣🔥]\s+\*\*Этичный",
    r"^\s*[📣🔥]\s+\*\*\d+",
]

CHANNEL_TO_SPHERE = {
    "@forallsales": "marketing",
    "@forallqa": "it",
    "@forallmarketing": "marketing",
    "@forallmedia": "marketing",
    "@forhr": "hr",
    "@forfrontend": "it",
    "@forcsharp": "it",
    "@foranalysts": "analytics",
    "@forallmobile": "it",
    "@jobforpr": "marketing",
}

SOURCE_TO_SPHERE = {
    "designhunters": "design",
    "designbirzha": "design",
    "junior_designers": "design",
    "job_python": "it",
    "react_native_jobs": "it",
    "it_vakansii_jobs": "it",
    "golang_jobs": "it",
    "it_interns": "it",
    "productjobgo": "it",
    "product_jobs": "it",
    "frilancekomfort": "it",
    "edujobs": "it",
    "profenture": "it",
    "digital_jobster": "marketing",
    "work_editor": "marketing",
    "studyqa": None,
}

# Sphere keywords for fallback detection
SPHERE_KEYWORDS = {
    "it": [
        "developer", "разработч", "программист", "frontend", "backend", "fullstack",
        "python", "java", "swift", "ios", "android", "mobile", "qa", "тестировщик",
        "devops", "sre", "data engineer", "ml", "machine learning", "ai", "blockchain",
        "web3", "c#", ".net", "react", "angular", "vue", "node", "golang", "php",
        "аналитик данных", "data analyst", "bi", "sql", "1c", "битрикс",
        "системный администратор", "поддержка", "support",
    ],
    "design": [
        "ux", "ui", "designer", "дизайнер", "figma", "sketch", "иллюстратор",
        "графический", "motion", "3d", "арт-директор", "верстальщик",
    ],
    "marketing": [
        "маркетолог", "smm", "seo", "контент", "копирайт", "редактор",
        "pr ", "product manager", "продуктолог", "brand", "таргет", "ppc",
        "sales", "продаж", "sdr", "bdr", "bdm", "менеджер по продажам",
        "account manager", "аккаунт", "бизнес-разви", "business development",
        "growth", "cmo",
    ],
    "analytics": [
        "аналитик", "analyst", "продуктовый аналитик", "финансовый аналитик",
        "бизнес-аналитик", "business analyst", "системный аналитик",
        "data science", "tableau", "power bi", "clickhouse",
    ],
    "product": [
        "product manager", "product owner", "продакт", "продукт",
        "управление продуктом", "roadmap", "custdev",
    ],
    "sales": [
        "sales", "продаж", "sdr", "bdr", "business development",
        "account executive", "менеджер по продажам", "аккаунт-менеджер",
    ],
    "support": [
        "support", "поддержк", "customer success", "service desk",
        "helpdesk", "техподдерж",
    ],
    "hr": [
        "hr", "recruiter", "рекрутер", "talent acquisition",
        "human resources", "hrbp", "people partner",
    ],
    "finance": [
        "finance", "финанс", "бухгалтер", "бюджет",
        "казначей", "финансовый контролер",
    ],
    "operations": [
        "operations", "операци", "логист", "supply chain",
        "закуп", "procurement", "координатор",
    ],
    "security": [
        "security", "инфобез", "кибербез", "soc", "siem",
        "pentest", "appsec", "red team", "blue team",
    ],
    "devops": [
        "devops", "sre", "kubernetes", "terraform",
        "ci/cd", "ansible", "инфраструктур",
    ],
    "legal": [
        "legal", "юрист", "compliance", "договор", "gdpr",
    ],
}

JUNK_ROLES = [
    "курьер", "охранник", "уборщик", "кассир", "повар", "официант",
    "водитель", "грузчик", "продавец-консультант", "администратор зала",
    "дегустатор", "титестер",  # unless it's really a niche tech role
]


def clean_url(url: str) -> str:
    """Strip trailing punctuation artifacts from URLs."""
    return re.sub(r'[)\.\*]+$', '', url).strip()


def is_aggregator(url: str) -> bool:
    return any(agg in url for agg in SKIP_AGGREGATORS)


def is_spam_or_non_vacancy(text: str) -> tuple[bool, str]:
    low = text.lower()
    for kw in SPAM_KEYWORDS:
        if kw.lower() in low:
            return True, f"spam keyword: {kw}"
    for pat in NON_JOB_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return True, "non-job pattern"
    # Too short to be a real vacancy
    if len(text.strip()) < 80:
        return True, "too short"
    # Multi-vacancy "подборка" posts: many salary mentions or many separate apply links
    salary_mentions = len(re.findall(r'\d[\d\s]{3,}\s*[₽руб]', text))
    if salary_mentions >= 3:
        return True, "multi-vacancy подборка"
    # Posts with 5+ distinct youngjunior/vseti/facancy vacancy links = aggregated list
    agg_links = re.findall(r'https?://(?:youngjunior|www\.vseti|facancy)\.(?:ru|app)/\S+', text)
    if len(agg_links) >= 3:
        return True, "multi-vacancy aggregated list"
    return False, ""


def strip_md(text: str) -> str:
    """Remove markdown bold/italic markers and inline links, keep plain text."""
    # [link text](url) → link text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # **bold** → bold
    text = re.sub(r'\*+([^*]+)\*+', r'\1', text)
    return text.strip()


def extract_title_company(text: str) -> tuple[str, str]:
    """Extract job title and company name from first two lines of the post."""
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if not lines:
        return "", ""

    # First line is typically the title
    title = strip_md(lines[0])
    title = re.sub(r'^\s*[🔹🔸⭐🌟📌✅💼]\s*', '', title).strip()
    # Remove leftover URL artifacts
    title = re.sub(r'https?://\S+', '', title).strip()

    company = ""
    # Pattern: "в **Company** — description" or "**Company** is a ..."
    for line in lines[1:4]:
        # Russian: "в **Avito** — ..."
        m = re.search(r'в\s+\*{1,2}([^*\n]{2,60})\*{1,2}', line)
        if m:
            company = m.group(1).strip()
            break
        # English: "**Company** is ..."
        m = re.search(r'^\*{1,2}([^*\n]{2,60})\*{1,2}\s+is\b', line, re.IGNORECASE)
        if m:
            company = m.group(1).strip()
            break
        # Pattern: "Компания: XYZ"
        m = re.search(r'компания[:\s]+\**([^*\n]+)\**', line, re.IGNORECASE)
        if m:
            company = m.group(1).strip().rstrip('.')
            break
        # Explicit bold company name on its own line: "**МТС Банк**"
        m = re.match(r'^\*{1,2}([А-ЯA-Z][^*\n]{2,40})\*{1,2}$', line)
        if m and not re.search(r'\bis\b|—|:', m.group(1)):
            # Likely a company name
            company = m.group(1).strip()
            break

    # Fallback: "Title / Company" format common in yuniorapp posts
    if not company and ' / ' in title:
        parts = title.rsplit(' / ', 1)
        title = parts[0].strip()
        company = parts[1].strip()

    return title, company


def extract_salary(text: str) -> tuple[int | None, int | None]:
    """Extract min/max salary in RUB. Ignores USD/EUR ranges."""
    # Convert thousands shorthand: 80К, 80K
    normalized = re.sub(r'(\d+)[кK]', lambda m: str(int(m.group(1)) * 1000), text)

    # Pattern: "80 000 — 100 000 ₽" or "от 80000 до 100000"
    m = re.search(r'(\d[\d\s]{2,8})\s*[—–-]\s*(\d[\d\s]{2,8})\s*[₽руб]', normalized)
    if m:
        lo = int(re.sub(r'\s', '', m.group(1)))
        hi = int(re.sub(r'\s', '', m.group(2)))
        if 10_000 <= lo <= 10_000_000 and lo <= hi:
            return lo, hi

    # "от 80000" or "от 80 000 ₽"
    m = re.search(r'от\s+(\d[\d\s]{2,8})\s*[₽руб]', normalized)
    if m:
        lo = int(re.sub(r'\s', '', m.group(1)))
        if 10_000 <= lo <= 5_000_000:
            return lo, None

    # "$0.5К–$1.5К" → skip USD for now
    return None, None


def extract_format(text: str) -> str:
    low = text.lower()
    if any(w in low for w in ["удалённ", "удаленн", "remote", "удалёнка"]):
        if any(w in low for w in ["гибрид", "hybrid", "офис"]):
            return "hybrid"
        return "remote"
    if any(w in low for w in ["гибрид", "hybrid"]):
        return "hybrid"
    if any(w in low for w in ["офис", "office", "on-site", "onsite", "очно"]):
        return "office"
    return "remote"  # default for junior/remote-first postings


def extract_employment_type(text: str) -> str:
    low = text.lower()
    if any(w in low for w in ["стажировк", "стажёр", "стажер", "intern", "trainee"]):
        return "internship"
    if any(w in low for w in ["part-time", "part time", "частичн", "неполн", "20 часов"]):
        return "parttime"
    return "project"  # "project" is the default full-time equivalent in this schema


def detect_sphere(text: str, source: str, channel_tag: str | None) -> str | None:
    # 1. Channel tag (most reliable)
    if channel_tag and channel_tag in CHANNEL_TO_SPHERE:
        return CHANNEL_TO_SPHERE[channel_tag]
    # 2. Source
    if source in SOURCE_TO_SPHERE:
        return SOURCE_TO_SPHERE[source]
    # 3. Text keywords
    low = text.lower()
    scores = {sphere: 0 for sphere in SPHERE_KEYWORDS}
    for sphere, keywords in SPHERE_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in low:
                scores[sphere] += 1
    best = max(scores, key=scores.get)
    if scores[best] > 0:
        return best
    return None


def detect_exp(text: str) -> str:
    low = text.lower()
    if any(w in low for w in [
        "без опыта", "опыт не требуется", "не требуется опыт",
        "стажёр", "стажер", "intern", "trainee", "experience is not required",
        "experience required: none",
    ]):
        return "none"
    if any(w in low for w in [
        "junior", "джуниор", "до 1 года", "0-1 год", "< 1 year",
        "junior+",
    ]):
        return "lt1"
    if any(w in low for w in [
        "middle", "1-3 год", "1–3 год", "2 год", "3 год",
        "junior / middle", "junior/middle",
    ]):
        return "1-3"
    if any(w in low for w in ["senior", "lead", "3+ год", "5 лет"]):
        return "gte3"
    return "lt1"  # default for a junior-focused platform


def extract_channel_tag(text: str) -> str | None:
    """Extract @channel tag at the bottom of jobforjunior posts."""
    m = re.search(r'(@for\w+|@job\w+)', text)
    return m.group(1) if m else None


def get_apply_url(links: list[str], text: str) -> str | None:
    """Pick the best apply URL: prefer direct company pages over aggregators."""
    cleaned = [clean_url(l) for l in links]

    # Prefer direct company career page over aggregator-style links
    priority_order = []
    linkedin_jobs = []
    google_forms = []
    aggregators_ok = []  # facancy, youngjunior, finder.work, etc.
    linkedin_posts = []
    telegram_links = []

    for url in cleaned:
        if is_aggregator(url):
            continue  # skip geekjob, hh
        if "t.me" in url or "telegram" in url:
            telegram_links.append(url)
        elif "linkedin.com/jobs" in url:
            linkedin_jobs.append(url)
        elif "docs.google.com/forms" in url:
            google_forms.append(url)
        elif "linkedin.com/posts" in url:
            linkedin_posts.append(url)
        elif any(agg in url for agg in ["facancy.ru", "youngjunior.ru", "finder.work",
                                         "huntflow", "getmatch", "djinni", "budu.jobs",
                                         "hrbazaar", "profi.ru"]):
            aggregators_ok.append(url)
        else:
            priority_order.append(url)

    # Return in order of preference
    for group in [priority_order, linkedin_jobs, google_forms, aggregators_ok, linkedin_posts]:
        if group:
            return group[0]

    return None


JUNK_LINE_PATTERNS = [
    r'@for\w+|@job\w+',
    r'Больше вакансий',
    r't\.me/[\+\w]',
    r'Подписаться|подписывайся',
    r'^(описание вакансии|job description|откликнуться|apply now|подробнее|more details)\b',
    r'Источник вакансии',
    r'^\s*[❤️👀😠😭🌚💚]\s*[—-]',   # voting lines
    r'Понравились вакансии',
    r'Разместить вакансию',
    r'мы также есть',
    r'https://max\.ru',
    r'^\s*📅\s+',   # "вчера" date lines
    r'Ищет\s+\w+,?\s+(его|её)\s+\[пост',
    r'🦆',           # youngjunior navigation links
    r'🐳\s+\[',      # "bigtech" links
    r'^\s*🔥\s*\[',  # promo links
    r'Читать подробнее',
    r'Прямой контакт рекрутера',
    r'Горящие вакансии',
    r'Все вакансии',
    r'(откликнуться|подать заявку|apply here)',
    r'Будет\s+плюсом\s*$',
]

JUNK_LINE_RE = re.compile('|'.join(JUNK_LINE_PATTERNS), re.IGNORECASE)

FORMAT_CONDITION_RE = re.compile(
    r'(удалённ|удаленн|remote|гибрид|hybrid|офис|office|on-site|москва|санкт|питер|'
    r'з/п|зарплат|формат работы|источник)',
    re.IGNORECASE
)


def is_junk_line(line: str) -> bool:
    return bool(JUNK_LINE_RE.search(line))


def build_description_markdown(
    text: str,
    company_desc: str,
    apply_url: str | None,
    location: str,
    salary_min: int | None,
    salary_max: int | None,
) -> str:
    lines = text.split('\n')

    section_keywords = {
        "о компании": "about",
        "about the company": "about",
        "about us": "about",
        "обязанности": "tasks",
        "задачи": "tasks",
        "what you will do": "tasks",
        "duties": "tasks",
        "what we expect": "requirements",
        "requirements": "requirements",
        "требования": "requirements",
        "ожидаем": "requirements",
        "что мы ожидаем": "requirements",
        "что важно": "requirements",
        "мы предлагаем": "conditions",
        "what we offer": "conditions",
        "условия": "conditions",
        "бонусы": "conditions",
        "стек": "stack",
        "технологии": "stack",
        "key skills": "stack",
        "tech stack": "stack",
    }

    blocks: dict[str, list[str]] = {}
    current_section = None
    intro_lines: list[str] = []
    in_intro = True

    for i, raw_line in enumerate(lines):
        stripped = raw_line.strip()
        if i == 0:
            continue  # skip title line
        if not stripped:
            if current_section:
                blocks[current_section].append("")
            continue
        if is_junk_line(stripped):
            continue

        # Detect section header: bold-only line or known keyword
        header_match = re.match(r'^\*{1,2}(.+?)\*{1,2}:?\s*$', stripped)
        header_text = header_match.group(1).strip().lower() if header_match else stripped.lower().rstrip(':')

        matched_section = None
        for kw, sec in section_keywords.items():
            if kw in header_text and len(stripped) < 70:
                matched_section = sec
                break

        if matched_section:
            if current_section and blocks.get(current_section):
                pass  # keep
            if matched_section not in blocks:
                blocks[matched_section] = []
            current_section = matched_section
            in_intro = False
            continue

        if current_section:
            # Normalize bullet markers
            clean = re.sub(r'^[\*\*—]*[⭐🔹🔸•✅\-–—►▪]\s*', '- ', stripped)
            # Strip inline markdown links from content (keep text)
            clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean)
            # Remove bold/italic markers
            clean = re.sub(r'\*+', '', clean).strip()
            # Skip lines that are just links or empty after cleanup
            if re.match(r'^https?://', clean) or not clean or clean == '-':
                continue
            # Skip separator lines
            if re.match(r'^[—\-_]{3,}', clean):
                continue
            blocks[current_section].append(clean)
        elif in_intro:
            # Collect intro/about lines — skip format/salary/source lines
            if FORMAT_CONDITION_RE.search(stripped):
                continue
            clean = strip_md(stripped)
            # Skip pure link lines
            if re.match(r'^https?://', clean) or re.match(r'^\[', stripped):
                continue
            if clean and len(clean) > 10:
                intro_lines.append(clean)

    def render_block(key: str) -> str:
        lines_b = blocks.get(key, [])
        seen = set()
        result = []
        for l in lines_b:
            l_stripped = l.strip()
            if not l_stripped:
                continue
            # Deduplicate similar lines
            key_norm = re.sub(r'[\s\-•]', '', l_stripped.lower())[:60]
            if key_norm in seen:
                continue
            seen.add(key_norm)
            result.append(l_stripped)
        return '\n'.join(result).strip()

    parts = []

    # О компании
    about_text = render_block("about") or "\n".join(intro_lines).strip()
    if not about_text and company_desc:
        about_text = company_desc
    if about_text:
        parts.append(f"## О компании\n\n{about_text}")

    # Задачи
    tasks = render_block("tasks")
    if tasks:
        parts.append(f"## Задачи\n\n{tasks}")

    # Требования
    reqs = render_block("requirements")
    if reqs:
        parts.append(f"## Требования\n\n{reqs}")

    # Стек технологий
    stack = render_block("stack")
    if stack:
        parts.append(f"## Стек технологий\n\n{stack}")

    # Условия работы
    conditions_parts = []
    conds = render_block("conditions")
    if conds:
        conditions_parts.append(conds)
    if location:
        conditions_parts.append(f"- Локация: {location}")
    if salary_min or salary_max:
        sal = f"- Зарплата: от {salary_min:,} ₽" if salary_min else ""
        if salary_max:
            sal += f" до {salary_max:,} ₽"
        conditions_parts.append(sal)
    if conditions_parts:
        parts.append("## Условия работы\n\n" + '\n'.join(conditions_parts))

    # Как откликнуться
    if apply_url:
        parts.append(f"## Как откликнуться\n\n[Открыть вакансию]({apply_url})")

    return "\n\n".join(parts)


def extract_location(text: str) -> str:
    """Extract city/country location hint."""
    # Common patterns: "Москва. Гибридный", "Location: Poland", "Алматы, Казахстан"
    m = re.search(
        r'(Москва|Санкт-Петербург|Питер|Минск|Алматы|Казахстан|Кипр|Cyprus|Poland|Польша|Беларусь|Belarus|Remote|Удалённо|Удаленно)',
        text, re.IGNORECASE
    )
    return m.group(0) if m else ""


def slugify(title: str, company: str, uid: str) -> str:
    """Generate a URL-safe slug from title + company + short uid."""
    combined = f"{title} {company}".lower()
    combined = re.sub(r'[^\w\s-]', '', combined)
    combined = re.sub(r'[\s_]+', '-', combined.strip())
    combined = re.sub(r'-+', '-', combined)
    # Transliterate basic Cyrillic
    cyrillic = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
        'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
        'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
        'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
    }
    combined = ''.join(cyrillic.get(c, c) for c in combined)
    combined = re.sub(r'[^a-z0-9-]', '', combined)[:60].strip('-')
    short_uid = uid[:8]
    return f"{combined}-{short_uid}" if combined else short_uid


def is_junk_role(title: str) -> bool:
    low = title.lower()
    return any(junk in low for junk in JUNK_ROLES)


# ─────────────────────────────────────────────
# MAIN PROCESSING
# ─────────────────────────────────────────────

def process():
    with open("raw_posts.json", encoding="utf-8") as f:
        posts = json.load(f)

    vacancies = []
    rejected = []
    seen_titles = set()  # dedup by (title, company)

    for post in posts:
        raw = post.get("raw_text", "")
        links = post.get("links_in_text", [])
        source = post.get("source", "")
        url = post.get("url", "")

        # ── 1. Spam / non-vacancy filter ──
        is_spam, reason = is_spam_or_non_vacancy(raw)
        if is_spam:
            rejected.append({**post, "rejection_reason": reason})
            continue

        # ── 2. Extract basic fields ──
        title, company = extract_title_company(raw)
        if not title or len(title) < 3:
            rejected.append({**post, "rejection_reason": "no title extracted"})
            continue

        if is_junk_role(title):
            rejected.append({**post, "rejection_reason": f"junk role: {title}"})
            continue

        # ── 3. Apply URL ──
        apply_url = get_apply_url(links, raw)
        # If no usable apply link, skip — user can't apply with no link
        if not apply_url:
            rejected.append({**post, "rejection_reason": "no usable apply URL"})
            continue

        # ── 4. Dedup by (title, company) ──
        dedup_key = (title.lower()[:40], company.lower()[:30])
        if dedup_key in seen_titles:
            rejected.append({**post, "rejection_reason": "duplicate title+company"})
            continue
        seen_titles.add(dedup_key)

        # ── 5. Remaining field extraction ──
        channel_tag = extract_channel_tag(raw)
        sphere = detect_sphere(raw, source, channel_tag)
        if sphere is None:
            sphere = "it"  # fallback for ambiguous posts

        salary_min, salary_max = extract_salary(raw)
        fmt = extract_format(raw)
        emp_type = extract_employment_type(raw)
        exp = detect_exp(raw)
        location = extract_location(raw)

        # Company description: second line of raw text after removing title/bold markers
        lines = [l.strip() for l in raw.split('\n') if l.strip()]
        company_desc = ""
        if len(lines) > 1:
            l2 = re.sub(r'\*+', '', lines[1]).strip()
            if company and l2.startswith(f"в {company}"):
                l2 = l2[len(f"в {company}"):].lstrip('— ').strip()
            if len(l2) > 20 and not re.search(r'@\w+', l2):
                company_desc = l2

        description = build_description_markdown(raw, company_desc, apply_url, location, salary_min, salary_max)

        vacancy_id = str(uuid.uuid4())
        slug = slugify(title, company, vacancy_id)

        vacancies.append({
            "id": vacancy_id,
            "slug": slug,
            "title": title,
            "company": company or "Не указана",
            "description": description,
            "sphere": sphere,
            "exp": exp,
            "format": fmt,
            "employment_type": emp_type,   # root schema field name
            "type": emp_type,              # web schema field name
            "salary_min": salary_min,
            "salary_max": salary_max,
            "bonus_tags": [],
            "apply_url": apply_url,        # NEW field — needs DB migration
            "is_published": True,
            "is_featured": False,
            "is_new": True,
            "published_at": datetime.now(timezone.utc).isoformat(),
            # Meta for review
            "_source": source,
            "_source_url": url,
            "_apply_url": apply_url,
        })

    with open("processed_vacancies.json", "w", encoding="utf-8") as f:
        json.dump(vacancies, f, ensure_ascii=False, indent=2)

    with open("rejected_posts.json", "w", encoding="utf-8") as f:
        json.dump(rejected, f, ensure_ascii=False, indent=2)

    # Stats
    sphere_counts = {}
    format_counts = {}
    type_counts = {}
    exp_counts = {}
    for v in vacancies:
        sphere_counts[v["sphere"]] = sphere_counts.get(v["sphere"], 0) + 1
        format_counts[v["format"]] = format_counts.get(v["format"], 0) + 1
        type_counts[v["employment_type"]] = type_counts.get(v["employment_type"], 0) + 1
        exp_counts[v["exp"]] = exp_counts.get(v["exp"], 0) + 1

    print(f"\n{'='*50}")
    print(f"PROCESSED: {len(vacancies)} vacancies")
    print(f"REJECTED:  {len(rejected)} posts")
    print(f"\nSphere breakdown:    {sphere_counts}")
    print(f"Format breakdown:    {format_counts}")
    print(f"Emp type breakdown:  {type_counts}")
    print(f"Exp breakdown:       {exp_counts}")
    salary_present = sum(1 for v in vacancies if v["salary_min"])
    print(f"With salary:         {salary_present} ({100*salary_present//len(vacancies)}%)")
    print(f"\nOutput: processed_vacancies.json, rejected_posts.json")


if __name__ == "__main__":
    process()
