from __future__ import annotations

import argparse
import json
import os
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

from description_normalizer import normalize_description


JUNK_TOKENS = [
    "пропустить навигацию",
    "условия использования",
    "открыть в яндекс",
    "часто задаваемые вопросы",
    "похожие вакансии",
    "рекомендовать друга",
    "пригласите друга",
    "прикрепить резюме",
    "загрузить резюме",
    "фамилия",
    "телефон",
    "e-mail",
    "отправить",
]

SECTION_HINTS = {
    "tasks": [
        "чем предстоит заниматься",
        "задачи",
        "обязанности",
        "what you will do",
        "responsibilities",
    ],
    "requirements": [
        "требования",
        "мы ожидаем",
        "что мы ждем",
        "для нас важно",
        "requirements",
        "qualifications",
    ],
    "conditions": [
        "условия",
        "мы предлагаем",
        "бонусы",
        "what we offer",
        "benefits",
    ],
}


@dataclass
class ReviewResult:
    status: str
    score: int
    issues: list[str]
    section_match: dict[str, bool]
    slug: str
    company: str
    title: str
    apply_url: str | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "score": self.score,
            "issues": self.issues,
            "section_match": self.section_match,
            "slug": self.slug,
            "company": self.company,
            "title": self.title,
            "apply_url": self.apply_url,
        }


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


def _fetch_supabase_rows(limit: int = 0) -> list[dict[str, Any]]:
    supabase_url = (
        os.environ.get("SUPABASE_URL")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        or ""
    ).strip()
    service_key = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not supabase_url or not service_key:
        raise RuntimeError("Missing SUPABASE URL or SUPABASE_SERVICE_KEY")

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    base = f"{supabase_url.rstrip('/')}/rest/v1/vacancies"
    rows: list[dict[str, Any]] = []
    offset = 0
    page_size = 200
    with requests.Session() as session:
        session.headers.update(headers)
        while True:
            params = {
                "select": "id,slug,title,company,description,description_blocks,apply_url,published_at",
                "order": "published_at.desc",
                "limit": str(page_size),
                "offset": str(offset),
            }
            resp = session.get(base, params=params, timeout=30)
            resp.raise_for_status()
            batch = resp.json()
            if not batch:
                break
            rows.extend(batch)
            if limit and len(rows) >= limit:
                return rows[:limit]
            offset += page_size
    return rows


def _strip_html(text: str) -> str:
    text = re.sub(r"<script.*?</script>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[a-zA-Z#0-9]+;", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _fetch_employer_text(url: str | None) -> str:
    if not url:
        return ""
    try:
        resp = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code != 200:
            return ""
        return _strip_html(resp.text)
    except Exception:
        return ""


def _has_any(text: str, tokens: list[str]) -> bool:
    low = text.lower()
    return any(tok in low for tok in tokens)


def _section_match(employer_text: str, blocks: list[dict[str, Any]]) -> dict[str, bool]:
    kinds = {str(b.get("kind", "")) for b in blocks if isinstance(b, dict)}
    out: dict[str, bool] = {}
    for sec, hints in SECTION_HINTS.items():
        source_has = _has_any(employer_text, hints)
        normalized_has = sec in kinds
        # if source does not have a hint, don't punish missing section
        out[sec] = (not source_has) or normalized_has
    return out


def _score_row(row: dict[str, Any], employer_text: str) -> ReviewResult:
    slug = str(row.get("slug") or "")
    title = str(row.get("title") or "")
    company = str(row.get("company") or "")
    apply_url = row.get("apply_url")
    desc = str(row.get("description") or "")
    blocks = row.get("description_blocks") or []
    if not isinstance(blocks, list):
        blocks = []

    issues: list[str] = []
    score = 100

    if not blocks:
        issues.append("no_blocks")
        score -= 60

    kinds = [str(b.get("kind", "")) for b in blocks if isinstance(b, dict)]
    if kinds.count("conditions") > 1:
        issues.append("duplicate_conditions")
        score -= 20

    low_desc = desc.lower()
    for tok in JUNK_TOKENS:
        if tok in low_desc:
            issues.append("junk_leak")
            score -= 5
            break

    # bullet quality
    short_items = 0
    for b in blocks:
        if not isinstance(b, dict):
            continue
        items = b.get("items") or []
        if not isinstance(items, list):
            continue
        for item in items:
            txt = str(item).strip()
            if 0 < len(txt) <= 10:
                short_items += 1
    if short_items:
        issues.append("short_items")
        score -= min(15, short_items * 2)

    # section matching with source page hints
    sec_match = _section_match(employer_text, blocks)
    for sec, ok in sec_match.items():
        if not ok:
            issues.append(f"section_mismatch_{sec}")
            score -= 12

    # Source text unavailable: cannot compare confidently
    if not employer_text and apply_url:
        issues.append("source_unavailable")
        score -= 5

    score = max(0, score)
    stoplist_markers = ("jetbrains", "cian")
    if any(marker in (apply_url or "").lower() for marker in stoplist_markers) or any(
        marker in company.lower() for marker in stoplist_markers
    ):
        status = "skip_by_stoplist"
    elif score >= 85:
        status = "ok"
    elif score >= 70:
        status = "minor_issue"
    elif "source_unavailable" in issues:
        status = "bad_source_text"
    else:
        status = "needs_company_rule"

    return ReviewResult(
        status=status,
        score=score,
        issues=sorted(set(issues)),
        section_match=sec_match,
        slug=slug,
        company=company,
        title=title,
        apply_url=apply_url,
    )


def _print_summary(results: list[ReviewResult]) -> None:
    by_status = Counter(r.status for r in results)
    by_issue = Counter(issue for r in results for issue in r.issues)
    by_company = Counter(r.company for r in results if r.status in {"needs_company_rule", "bad_source_text"})

    print(f"reviewed={len(results)}")
    print("\nstatus:")
    for k, v in by_status.most_common():
        print(f"  {k}: {v}")
    print("\nissues:")
    for k, v in by_issue.most_common(20):
        print(f"  {k}: {v}")
    print("\ncompanies_to_fix:")
    for k, v in by_company.most_common(12):
        print(f"  {k}: {v}")
    print("\nexamples:")
    for status in ("needs_company_rule", "bad_source_text", "minor_issue"):
        ex = [r for r in results if r.status == status][:6]
        if not ex:
            continue
        print(f"\n## {status}")
        for r in ex:
            print(f"- {r.company} | {r.title} | {r.apply_url} | score={r.score} | issues={','.join(r.issues)}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Side-by-side quality review for normalized vacancy descriptions")
    ap.add_argument("--env-file", default="web/.env.local", help="Path to env file with Supabase keys")
    ap.add_argument("--limit", type=int, default=0, help="Limit number of rows")
    ap.add_argument("--output-json", default="", help="Optional path to save detailed JSON results")
    ap.add_argument("--skip-fetch-source", action="store_true", help="Do not fetch employer pages, review DB text only")
    args = ap.parse_args()

    _load_env_from_file(args.env_file)
    rows = _fetch_supabase_rows(limit=args.limit)

    results: list[ReviewResult] = []
    for row in rows:
        employer_text = ""
        if not args.skip_fetch_source:
            employer_text = _fetch_employer_text(row.get("apply_url"))
        if not employer_text:
            # fallback: use current normalized text as low-confidence source
            employer_text = str(row.get("description") or "")
        results.append(_score_row(row, employer_text))

    _print_summary(results)

    if args.output_json:
        payload = [r.to_dict() for r in results]
        Path(args.output_json).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\njson_report_saved={args.output_json}")


if __name__ == "__main__":
    main()

