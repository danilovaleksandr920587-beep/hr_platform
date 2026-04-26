"""
uploader.py — прямая загрузка вакансий в Supabase через REST API.

Запуск:
    python3 uploader.py                           # из output_vacancies.json
    python3 uploader.py --input enriched.json
    python3 uploader.py --dry-run                 # проверить без загрузки
"""

import argparse
import json
import logging
import os
import re
import sys
import time

import requests
try:
    from vacancy_quality import assess_quality
except ImportError:
    from junior_jobs_parser.vacancy_quality import assess_quality

try:
    from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
except ImportError:
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

logger = logging.getLogger(__name__)

BATCH_SIZE = 20

# Только ISO date (YYYY-MM-DD) или timestamptz — иначе Postgres отклонит строки вроде «22 апреля».
_RE_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_RE_ISO_TS = re.compile(r"^\d{4}-\d{2}-\d{2}T")
_LISTING_URL_RE = re.compile(
    r"/(?:vacancies?|jobs?|career|work)(?:/)?$|/vacancies/(?:all|students)(?:/)?$",
    re.IGNORECASE,
)
_SECTION_TITLE_RE = re.compile(
    r"^(все направления|управление командой|направления|категории|все вакансии)$",
    re.IGNORECASE,
)
_FILTER_PAGE_HINTS_RE = re.compile(
    r"график работы|опыт работы|направления|ключевые навыки|найти|фильтр",
    re.IGNORECASE,
)


def _sanitize_source_published_at(value) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    if _RE_ISO_DATE.match(s) or _RE_ISO_TS.match(s):
        return s
    return None


def _headers() -> dict:
    return {
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates,return=minimal",
    }


def _is_bad_listing_record(row: dict) -> bool:
    title = str(row.get("title") or "").strip()
    desc = str(row.get("description") or "").strip()
    apply_url = str(row.get("apply_url") or "").strip().lower()
    if not apply_url:
        return True
    if _SECTION_TITLE_RE.match(title):
        return True
    if _LISTING_URL_RE.search(apply_url):
        return True
    if len(desc.split()) < 20:
        return True
    if _FILTER_PAGE_HINTS_RE.search(desc) and "обязанности" not in desc.lower():
        return True
    return False


def delete_all_vacancies() -> bool:
    """Удаляет все строки из public.vacancies (service role)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False
    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/vacancies"
    try:
        resp = requests.delete(
            endpoint,
            headers={**_headers(), "Prefer": "return=minimal"},
            params={"id": "not.is.null"},
            timeout=60,
        )
        if resp.status_code in (200, 204):
            logger.info("Supabase: все вакансии удалены.")
            return True
        logger.error("Supabase: delete all — %s — %s", resp.status_code, resp.text[:500])
        return False
    except Exception as e:
        logger.error("Supabase: не удалось очистить таблицу — %s", e)
        return False


def check_connection() -> bool:
    """Проверяет, что Supabase доступен и ключ работает."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.error(
            "Не заданы SUPABASE_URL / SUPABASE_SERVICE_KEY в config.py.\n"
            "Добавьте:\n"
            "  SUPABASE_URL         = 'https://tetukoylasquueg.beget.app'\n"
            "  SUPABASE_SERVICE_KEY = 'eyJ...'"
        )
        return False
    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/vacancies?limit=1"
    try:
        resp = requests.get(endpoint, headers=_headers(), timeout=10)
        if resp.status_code in (200, 206):
            logger.info("Supabase: соединение OK (%s)", SUPABASE_URL)
            return True
        logger.error("Supabase: ответ %d — %s", resp.status_code, resp.text[:200])
        return False
    except Exception as e:
        logger.error("Supabase: не удалось подключиться — %s", e)
        return False


def supports_column(column_name: str) -> bool:
    """Проверяет, есть ли колонка в таблице vacancies."""
    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/vacancies?select={column_name}&limit=1"
    try:
        resp = requests.get(endpoint, headers=_headers(), timeout=10)
        return resp.status_code in (200, 206)
    except Exception:
        return False


def upload_rows(rows: list[dict], dry_run: bool = False) -> tuple[int, int]:
    """
    Загружает строки (уже сконвертированные convert_vacancy) в Supabase.
    Возвращает (uploaded, failed).
    """
    strict_mode = (os.environ.get("VACANCY_STRICT_QUALITY", "1") or "1").strip() != "0"
    stoplist = {
        x.strip().lower()
        for x in (os.environ.get("VACANCY_STOPLIST_COMPANIES", "jetbrains,cian") or "jetbrains,cian").split(",")
        if x.strip()
    }
    rows = [r for r in rows if not _is_bad_listing_record(r)]
    rows = [r for r in rows if str(r.get("company") or "").strip().lower() not in stoplist]
    low_quality = []
    filtered_rows: list[dict] = []
    for r in rows:
        q = assess_quality(
            description=str(r.get("description") or ""),
            description_blocks=r.get("description_blocks") if isinstance(r.get("description_blocks"), list) else [],
            warnings=[],
            source_text=None,
        )
        r["quality_status"] = q["quality_status"]
        r["quality_score"] = q["quality_score"]
        r["quality_issues"] = q["quality_issues"]
        if q["quality_status"] != "ready":
            low_quality.append(
                f"{r.get('company')} | {r.get('title')} | {r.get('apply_url')} | {q['quality_status']} | {','.join(q['quality_issues'])}"
            )
            if strict_mode:
                continue
        filtered_rows.append(r)
    rows = filtered_rows
    if low_quality:
        logger.warning("Low-quality rows before upload: %d", len(low_quality))
        for sample in low_quality[:15]:
            logger.warning("  %s", sample)
    if dry_run:
        logger.info("[DRY-RUN] Будет загружено %d вакансий.", len(rows))
        for r in rows[:3]:
            logger.info("  Пример: %s / %s", r.get("title", "?"), r.get("company", "?"))
        return len(rows), 0

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.error("Не заданы SUPABASE_URL / SUPABASE_SERVICE_KEY в config.py")
        return 0, len(rows)

    endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/vacancies?on_conflict=slug"
    uploaded = 0
    failed = 0

    optional_cols = [
        "company_about",
        "city",
        "skills",
        "source_published_at",
        "description_blocks",
        "quality_status",
        "quality_score",
        "quality_issues",
    ]
    for col in optional_cols:
        if rows and col in rows[0] and not supports_column(col):
            logger.warning("Колонка %s пока не применена в Supabase. Загружаем без неё.", col)
            rows = [{k: v for k, v in row.items() if k != col} for row in rows]

    def post_batch(batch: list[dict], batch_no: int) -> tuple[int, int]:
        nonlocal uploaded
        try:
            resp = requests.post(
                endpoint,
                headers=_headers(),
                json=batch,
                timeout=30,
            )
            if resp.status_code in (200, 201, 204):
                uploaded += len(batch)
                logger.info("Загружено %d/%d вакансий.", uploaded, len(rows))
                return len(batch), 0

            txt = resp.text[:1000]
            if resp.status_code == 413 and len(batch) > 1:
                mid = len(batch) // 2
                ok1, fail1 = post_batch(batch[:mid], batch_no)
                ok2, fail2 = post_batch(batch[mid:], batch_no)
                return ok1 + ok2, fail1 + fail2

            if resp.status_code == 413 and len(batch) == 1:
                row = dict(batch[0])
                desc = row.get("description")
                if isinstance(desc, str) and len(desc) > 5000:
                    row["description"] = desc[:5000]
                    retry = requests.post(
                        endpoint,
                        headers=_headers(),
                        json=[row],
                        timeout=30,
                    )
                    if retry.status_code in (200, 201, 204):
                        uploaded += 1
                        logger.info("Загружено %d/%d вакансий (сокращено описание).", uploaded, len(rows))
                        return 1, 0

            logger.error(
                "Ошибка батча %d: статус %d — %s",
                batch_no,
                resp.status_code,
                txt[:300],
            )
            return 0, len(batch)
        except Exception as e:
            logger.error("Ошибка при отправке батча %d: %s", batch_no, e)
            return 0, len(batch)

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        _, fail = post_batch(batch, i // BATCH_SIZE + 1)
        failed += fail
        time.sleep(0.3)

    return uploaded, failed


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    ap = argparse.ArgumentParser(description="Загрузчик вакансий в Supabase")
    ap.add_argument("--input",   default="output_vacancies.json")
    ap.add_argument("--dry-run", action="store_true",
                    help="Не загружать, только показать что будет отправлено")
    ap.add_argument(
        "--replace-all",
        action="store_true",
        help="Перед загрузкой удалить все вакансии в Supabase",
    )
    args = ap.parse_args()

    if not os.path.exists(args.input):
        logger.error("Файл %s не найден.", args.input)
        sys.exit(1)

    with open(args.input, encoding="utf-8") as f:
        vacancies = json.load(f)

    logger.info("Загружено %d вакансий из %s", len(vacancies), args.input)

    if not args.dry_run and not check_connection():
        sys.exit(1)

    if args.replace_all and not args.dry_run:
        if not delete_all_vacancies():
            sys.exit(1)

    # formatted_vacancies.json уже содержит правильные поля — просто чистим внутренние
    INTERNAL = {'_source', '_source_type', '_hash', 'text', 'contacts', 'hash', 'source', 'source_type', 'url'}
    DB_COLS   = {'slug','title','company','description','sphere','exp','format',
                 'employment_type','salary_min','salary_max','apply_url','company_about',
                 'city','skills','source_published_at','description_blocks','quality_status','quality_score','quality_issues',
                 'bonus_tags','is_featured','is_published','published_at'}

    first = vacancies[0] if vacancies else {}
    has_ready_shape = (
        isinstance(first, dict)
        and {"slug", "title", "company"}.issubset(set(first.keys()))
        and bool(set(first.keys()) & DB_COLS)
    )
    if has_ready_shape:
        # formatted_vacancies.json — уже готово, только убираем внутренние поля
        rows = [{k: v for k, v in row.items() if k not in INTERNAL} for row in vacancies]
        from exporter import sanitize_apply_url
        for row in rows:
            if "apply_url" in row:
                row["apply_url"] = sanitize_apply_url(row.get("apply_url"))
            if "source_published_at" in row:
                row["source_published_at"] = _sanitize_source_published_at(
                    row.get("source_published_at")
                )
    else:
        # Старый формат output_vacancies.json — используем convert_vacancy
        sys.path.insert(0, os.path.dirname(__file__))
        from exporter import convert_vacancy
        rows = [convert_vacancy(v) for v in vacancies]
        for row in rows:
            if "source_published_at" in row:
                row["source_published_at"] = _sanitize_source_published_at(
                    row.get("source_published_at")
                )

    uploaded, failed = upload_rows(rows, dry_run=args.dry_run)

    if args.dry_run:
        logger.info("Dry-run завершён. Вакансий готово к загрузке: %d", len(rows))
    else:
        logger.info("Готово. Загружено: %d | Ошибок: %d", uploaded, failed)


if __name__ == "__main__":
    main()
