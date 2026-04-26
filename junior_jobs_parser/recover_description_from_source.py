from __future__ import annotations

import argparse
import os
import re
from collections import Counter
from pathlib import Path
from typing import Any

import requests

from description_normalizer import normalize_description
try:
    from vacancy_quality import assess_quality, is_better_or_equal_quality
except ImportError:
    from junior_jobs_parser.vacancy_quality import assess_quality, is_better_or_equal_quality


def _load_env_from_file(path: str) -> None:
    p = Path(path)
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def _strip_html(text: str) -> str:
    text = re.sub(r"<script.*?</script>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"</?(br|p|div|li|ul|ol|h[1-6]|section|article|main|header|footer)[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[a-zA-Z#0-9]+;", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def _detect_company_key(url: str | None) -> str:
    low = (url or "").lower()
    if "cian." in low:
        return "cian"
    if "lamoda" in low:
        return "lamoda"
    if "kaspersky" in low:
        return "kaspersky"
    if "ptsecurity" in low:
        return "positive"
    if "kontur" in low:
        return "kontur"
    if "cdek" in low:
        return "cdek"
    return "generic"


def _extract_between_markers(text: str, start_markers: list[str], end_markers: list[str]) -> str:
    low = text.lower()
    start_idx = 0
    for m in start_markers:
        i = low.find(m)
        if i >= 0:
            start_idx = i
            break
    end_idx = len(text)
    for m in end_markers:
        i = low.find(m, start_idx + 1)
        if i >= 0:
            end_idx = i
            break
    return text[start_idx:end_idx].strip()


def _extract_company_text(url: str | None, html: str) -> str:
    plain = _strip_html(html)
    key = _detect_company_key(url)
    if key == "lamoda":
        return _extract_between_markers(
            plain,
            ["чем ты будешь заниматься", "чем предстоит заниматься"],
            ["откликнуться", "о компании", "©", "подписка"],
        )
    if key == "kaspersky":
        return _extract_between_markers(
            plain,
            ["основные задачи", "чем предстоит заниматься", "задачи"],
            ["похожие вакансии", "откликнуться", "©", "вакансии стажировки события"],
        )
    if key == "positive":
        return _extract_between_markers(
            plain,
            ["чем предстоит заниматься", "наши ожидания", "мы предлагаем"],
            ["расскажите нам о себе", "© positive technologies", "лидер результативной кибербезопасности"],
        )
    if key == "kontur":
        return _extract_between_markers(
            plain,
            ["задачи", "чем предстоит заниматься", "мы ожидаем"],
            ["отправить резюме", "рекомендовать друга", "похожие вакансии"],
        )
    if key == "cdek":
        return _extract_between_markers(
            plain,
            ["чем предстоит заниматься", "обязанности", "задачи"],
            ["условия использования", "открыть в яндекс", "часто задаваемые вопросы"],
        )
    return plain


def _fetch_source_payload(url: str | None) -> tuple[str, str]:
    if not url:
        return "", ""
    try:
        resp = requests.get(
            url,
            timeout=25,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        if resp.status_code != 200:
            return "", ""
        html = resp.text
        return _extract_company_text(url, html), html
    except Exception:
        return "", ""


def _source_looks_bad(source_text: str, html: str) -> bool:
    low = f"{source_text}\n{html}".lower()
    return any(
        token in low
        for token in (
            "вы не робот",
            "captcha",
            "cloudflare",
            "access denied",
            "похоже на автоматические запросы",
        )
    )


def _supports_column(session: requests.Session, base_url: str, col: str) -> bool:
    try:
        r = session.get(base_url, params={"select": col, "limit": "1"}, timeout=15)
        return r.status_code in (200, 206)
    except Exception:
        return False


def main() -> None:
    ap = argparse.ArgumentParser(description="Recover vacancy descriptions from live source pages")
    ap.add_argument("--env-file", default="web/.env.local")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="Max rows to process")
    ap.add_argument(
        "--companies",
        default="CDEK,Lamoda,ЦИАН,Контур,Лаборатория Касперского,Positive Technologies",
        help="Comma-separated company list",
    )
    args = ap.parse_args()

    _load_env_from_file(args.env_file)
    supabase_url = (os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
    service_key = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not supabase_url or not service_key:
        raise SystemExit("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY")

    companies = [x.strip() for x in args.companies.split(",") if x.strip()]
    base = f"{supabase_url.rstrip('/')}/rest/v1/vacancies"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    scanned = 0
    updated = 0
    skipped = 0
    source_fail = 0
    issue_counts: Counter[str] = Counter()
    updated_samples: list[str] = []
    quarantined = 0

    with requests.Session() as session:
        session.headers.update(headers)
        has_quality_status = _supports_column(session, base, "quality_status")
        has_quality_score = _supports_column(session, base, "quality_score")
        has_quality_issues = _supports_column(session, base, "quality_issues")
        has_raw_source_text = _supports_column(session, base, "raw_source_text")
        for company in companies:
            params = {
                "select": "id,title,company,description,apply_url,description_blocks",
                "company": f"eq.{company}",
                "order": "published_at.desc",
            }
            resp = session.get(base, params=params, timeout=40)
            resp.raise_for_status()
            rows = resp.json()

            for row in rows:
                if args.limit and scanned >= args.limit:
                    break
                scanned += 1
                source_text, source_html = _fetch_source_payload(row.get("apply_url"))
                if not source_text or _source_looks_bad(source_text, source_html):
                    source_fail += 1
                    skipped += 1
                    continue

                normalized = normalize_description(
                    raw_text=source_text,
                    title=row.get("title"),
                    company=row.get("company"),
                    source=None,
                    apply_url=row.get("apply_url"),
                )
                next_desc = normalized.description.strip() if normalized.description else ""
                next_blocks = normalized.description_blocks
                old_desc = str(row.get("description") or "").strip()
                old_blocks = row.get("description_blocks") if isinstance(row.get("description_blocks"), list) else []
                old_quality = assess_quality(
                    description=old_desc,
                    description_blocks=old_blocks,
                    warnings=[],
                    source_text=None,
                )
                new_quality = assess_quality(
                    description=next_desc,
                    description_blocks=next_blocks if isinstance(next_blocks, list) else [],
                    warnings=normalized.warnings,
                    source_text=source_text,
                )
                for issue in normalized.warnings:
                    issue_counts[issue] += 1

                prev_desc = old_desc
                if prev_desc == next_desc and row.get("description_blocks") == next_blocks:
                    skipped += 1
                    continue
                if not is_better_or_equal_quality(new_quality, old_quality):
                    quarantined += 1
                    skipped += 1
                    continue

                if not args.dry_run:
                    patch_params = {"id": f"eq.{row['id']}"}
                    payload: dict[str, Any] = {
                        "description": next_desc or prev_desc,
                        "description_blocks": next_blocks,
                    }
                    if has_quality_status:
                        payload["quality_status"] = new_quality.get("quality_status")
                    if has_quality_score:
                        payload["quality_score"] = new_quality.get("quality_score")
                    if has_quality_issues:
                        payload["quality_issues"] = new_quality.get("quality_issues")
                    if has_raw_source_text:
                        payload["raw_source_text"] = source_text[:50000]
                    up = session.patch(base, params=patch_params, json=payload, timeout=40)
                    up.raise_for_status()
                updated += 1
                if len(updated_samples) < 20:
                    updated_samples.append(
                        f"{row.get('company')} | {row.get('title')} | {row.get('apply_url')}"
                    )
            if args.limit and scanned >= args.limit:
                break

    mode = "dry-run" if args.dry_run else "apply"
    print(
        f"recover_description_from_source [{mode}]: scanned={scanned} updated={updated} "
        f"skipped={skipped} source_fail={source_fail} quarantined={quarantined}"
    )
    if issue_counts:
        print("quality_issues_top:")
        for issue, cnt in issue_counts.most_common(12):
            print(f"  {issue}: {cnt}")
    if updated_samples:
        print("updated_samples:")
        for sample in updated_samples:
            print(f"  - {sample}")


if __name__ == "__main__":
    main()
