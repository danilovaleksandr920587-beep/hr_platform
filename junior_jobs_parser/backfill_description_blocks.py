from __future__ import annotations

import argparse
import os
from collections import Counter
from pathlib import Path

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


def _env(name: str, fallback: str = "") -> str:
    return (os.environ.get(name) or fallback).strip()


def _supports_column(session: requests.Session, base_url: str, col: str) -> bool:
    try:
        r = session.get(base_url, params={"select": col, "limit": "1"}, timeout=15)
        return r.status_code in (200, 206)
    except Exception:
        return False


def main() -> None:
    ap = argparse.ArgumentParser(description="Backfill description_blocks for existing vacancies")
    ap.add_argument("--env-file", default="web/.env.local", help="Path to env file with Supabase keys")
    ap.add_argument("--dry-run", action="store_true", help="Only print counters, do not PATCH rows")
    ap.add_argument("--limit", type=int, default=0, help="Max rows to scan (0 = all)")
    args = ap.parse_args()

    _load_env_from_file(args.env_file)

    supabase_url = _env("SUPABASE_URL") or _env("NEXT_PUBLIC_SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_KEY")
    if not supabase_url or not service_key:
        raise SystemExit("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY")

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
    issue_counts: Counter[str] = Counter()
    low_quality_samples: list[str] = []
    quarantined = 0
    quarantine_samples: list[str] = []
    offset = 0
    page_size = 200

    with requests.Session() as session:
        session.headers.update(headers)
        has_quality_status = _supports_column(session, base, "quality_status")
        has_quality_score = _supports_column(session, base, "quality_score")
        has_quality_issues = _supports_column(session, base, "quality_issues")

        while True:
            params = {
                "select": "id,title,company,description,apply_url,description_blocks",
                "order": "published_at.desc",
                "limit": str(page_size),
                "offset": str(offset),
            }
            resp = session.get(base, params=params, timeout=30)
            resp.raise_for_status()
            rows = resp.json()
            if not rows:
                break

            for row in rows:
                if args.limit and scanned >= args.limit:
                    break
                scanned += 1
                raw_desc = str(row.get("description") or "").strip()
                if not raw_desc:
                    skipped += 1
                    continue

                normalized = normalize_description(
                    raw_text=raw_desc,
                    title=row.get("title"),
                    company=row.get("company"),
                    source=None,
                    apply_url=row.get("apply_url"),
                )
                next_desc = (normalized.description or raw_desc).strip()
                next_blocks = normalized.description_blocks
                old_quality = assess_quality(
                    description=raw_desc,
                    description_blocks=row.get("description_blocks") if isinstance(row.get("description_blocks"), list) else [],
                    warnings=[],
                    source_text=None,
                )
                new_quality = assess_quality(
                    description=next_desc,
                    description_blocks=next_blocks if isinstance(next_blocks, list) else [],
                    warnings=normalized.warnings,
                    source_text=None,
                )
                for issue in normalized.warnings:
                    issue_counts[issue] += 1
                if "missing_tasks" in normalized.warnings and "missing_requirements" in normalized.warnings:
                    if len(low_quality_samples) < 20:
                        low_quality_samples.append(
                            f"{row.get('company')} | {row.get('title')} | {row.get('apply_url')}"
                        )

                if row.get("description_blocks") == next_blocks and raw_desc == next_desc:
                    skipped += 1
                    continue
                if not is_better_or_equal_quality(new_quality, old_quality):
                    quarantined += 1
                    if len(quarantine_samples) < 20:
                        quarantine_samples.append(
                            f"{row.get('company')} | {row.get('title')} | {row.get('apply_url')} | old={old_quality.get('quality_status')}:{old_quality.get('quality_score')} new={new_quality.get('quality_status')}:{new_quality.get('quality_score')}"
                        )
                    skipped += 1
                    continue

                if not args.dry_run:
                    patch_params = {"id": f"eq.{row['id']}"}
                    payload = {
                        "description": next_desc,
                        "description_blocks": next_blocks,
                    }
                    if has_quality_status:
                        payload["quality_status"] = new_quality.get("quality_status")
                    if has_quality_score:
                        payload["quality_score"] = new_quality.get("quality_score")
                    if has_quality_issues:
                        payload["quality_issues"] = new_quality.get("quality_issues")
                    up = session.patch(base, params=patch_params, json=payload, timeout=30)
                    up.raise_for_status()
                updated += 1

            if args.limit and scanned >= args.limit:
                break
            offset += page_size

    mode = "dry-run" if args.dry_run else "apply"
    print(
        f"backfill_description_blocks [{mode}]: scanned={scanned} updated={updated} "
        f"skipped={skipped} quarantined={quarantined}"
    )
    if issue_counts:
        print("quality_issues_top:")
        for issue, cnt in issue_counts.most_common(12):
            print(f"  {issue}: {cnt}")
    if low_quality_samples:
        print("low_quality_samples:")
        for sample in low_quality_samples:
            print(f"  - {sample}")
    if quarantine_samples:
        print("quarantine_samples:")
        for sample in quarantine_samples:
            print(f"  - {sample}")


if __name__ == "__main__":
    main()

