"""
backfill_descriptions.py — прогоняет все существующие вакансии через description_normalizer
и обновляет поля description + description_blocks в Supabase.

Запуск:
    python3 backfill_descriptions.py           # реальный прогон
    python3 backfill_descriptions.py --dry-run # только статистика, без записи
    python3 backfill_descriptions.py --limit 5 # обновить только первые N
"""

import argparse
import json
import logging
import sys
import time
import requests

SUPABASE_URL = "https://tetukoylasquueg.beget.app"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzY2NDMyMDAsImV4cCI6MTkzNDQwOTYwMH0.72ewxbxY7XVAcu7ObFZM9LXjQ25nme9RQZ-ab3GRPXU"

PAGE_SIZE = 50

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def headers():
    return {
        "apikey":        SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }


def fetch_all_vacancies() -> list[dict]:
    """Выгружает все вакансии постранично."""
    rows = []
    offset = 0
    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/vacancies"
            f"?select=id,title,company,description,apply_url"
            f"&limit={PAGE_SIZE}&offset={offset}"
        )
        resp = requests.get(url, headers=headers(), timeout=30)
        if resp.status_code not in (200, 206):
            log.error("Ошибка при получении вакансий: %s %s", resp.status_code, resp.text[:300])
            sys.exit(1)
        batch = resp.json()
        if not batch:
            break
        rows.extend(batch)
        log.info("Получено %d вакансий (всего %d)...", len(batch), len(rows))
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        time.sleep(0.1)
    return rows


def patch_vacancy(vacancy_id: str, description: str, description_blocks: list) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/vacancies?id=eq.{vacancy_id}"
    payload = {
        "description":        description,
        "description_blocks": description_blocks,
    }
    resp = requests.patch(url, headers=headers(), json=payload, timeout=15)
    if resp.status_code in (200, 204):
        return True
    log.error("PATCH %s → %s: %s", vacancy_id, resp.status_code, resp.text[:300])
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Не записывать, только считать")
    ap.add_argument("--limit",   type=int, default=0, help="Обработать только первые N")
    args = ap.parse_args()

    sys.path.insert(0, "/var/www/hr_platform/junior_jobs_parser")
    from description_normalizer import normalize_description

    log.info("Загружаю вакансии из Supabase…")
    vacancies = fetch_all_vacancies()
    log.info("Всего вакансий: %d", len(vacancies))

    if args.limit:
        vacancies = vacancies[: args.limit]
        log.info("Ограничение --limit %d применено.", args.limit)

    updated = skipped = failed = 0

    for i, vac in enumerate(vacancies, 1):
        vid   = vac["id"]
        title = vac.get("title") or ""
        comp  = vac.get("company") or ""
        desc  = vac.get("description") or ""
        url   = vac.get("apply_url") or ""

        if not desc.strip():
            log.warning("[%d/%d] id=%s — пустое description, пропускаем", i, len(vacancies), vid)
            skipped += 1
            continue

        try:
            result = normalize_description(
                raw_text=desc,
                title=title,
                company=comp,
                apply_url=url,
            )
        except Exception as exc:
            log.error("[%d/%d] id=%s — ошибка нормализации: %s", i, len(vacancies), vid, exc)
            failed += 1
            continue

        if args.dry_run:
            log.info(
                "[DRY %d/%d] %s — %d блоков, description_len=%d",
                i, len(vacancies), title[:50], len(result.description_blocks), len(result.description),
            )
            updated += 1
            continue

        ok = patch_vacancy(vid, result.description, result.description_blocks)
        if ok:
            updated += 1
            if i % 10 == 0:
                log.info("Прогресс: %d/%d обновлено", updated, len(vacancies))
        else:
            failed += 1
        time.sleep(0.05)  # rate-limit

    log.info("=" * 50)
    if args.dry_run:
        log.info("DRY-RUN завершён. Готово к обновлению: %d | Пропущено: %d | Ошибок: %d",
                 updated, skipped, failed)
    else:
        log.info("Готово. Обновлено: %d | Пропущено: %d | Ошибок: %d",
                 updated, skipped, failed)


if __name__ == "__main__":
    main()
