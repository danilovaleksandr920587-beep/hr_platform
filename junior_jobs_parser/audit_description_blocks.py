from __future__ import annotations

import argparse
import json
import os
from collections import Counter, defaultdict
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

from description_normalizer import normalize_description


def _read_json(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    raise ValueError(f"{path}: expected JSON array")


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


def _fetch_rows_from_supabase(limit: int = 0) -> list[dict]:
    if requests is None:
        raise RuntimeError("requests is required for --from-supabase mode")
    supabase_url = (
        os.environ.get("SUPABASE_URL")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        or ""
    ).strip()
    service_key = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not supabase_url or not service_key:
        raise RuntimeError("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY")

    base = f"{supabase_url.rstrip('/')}/rest/v1/vacancies"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    offset = 0
    page_size = 200
    out: list[dict] = []
    with requests.Session() as session:
        session.headers.update(headers)
        while True:
            params = {
                "select": "id,title,company,description,apply_url,source_published_at",
                "order": "published_at.desc",
                "limit": str(page_size),
                "offset": str(offset),
            }
            resp = session.get(base, params=params, timeout=30)
            resp.raise_for_status()
            rows = resp.json()
            if not rows:
                break
            out.extend(rows)
            if limit and len(out) >= limit:
                return out[:limit]
            offset += page_size
    return out


def _company_key(row: dict) -> str:
    return (
        row.get("company")
        or row.get("source")
        or row.get("_source")
        or row.get("source_type")
        or "unknown"
    )


def run_audit(rows: list[dict], max_examples: int = 3, stoplist: set[str] | None = None) -> dict:
    stoplist = stoplist or set()
    issue_counts = Counter()
    by_company: dict[str, Counter] = defaultdict(Counter)
    examples: dict[str, list[dict]] = defaultdict(list)
    block_shapes: dict[str, Counter] = defaultdict(Counter)

    for row in rows:
        raw_text = row.get("description") or row.get("text") or ""
        if not isinstance(raw_text, str) or not raw_text.strip():
            continue
        company = _company_key(row)
        company_key = company.strip().lower()
        if company_key in stoplist:
            continue
        norm = normalize_description(
            raw_text=raw_text,
            title=row.get("title"),
            company=row.get("company"),
            source=row.get("source") or row.get("_source"),
            apply_url=row.get("apply_url"),
        )
        kinds = [b.get("kind", "other") for b in norm.description_blocks]
        shape = " > ".join(kinds) if kinds else "no_blocks"
        block_shapes[company][shape] += 1
        for issue in norm.warnings:
            issue_counts[issue] += 1
            by_company[company][issue] += 1
            if len(examples[issue]) < max_examples:
                examples[issue].append(
                    {
                        "company": company,
                        "title": row.get("title"),
                        "apply_url": row.get("apply_url"),
                        "shape": shape,
                        "snippet": (norm.description or "")[:300].replace("\n", " | "),
                    }
                )
    return {
        "rows": len(rows),
        "issues": issue_counts,
        "by_company": by_company,
        "examples": examples,
        "block_shapes": block_shapes,
    }


def _print_report(report: dict, top_companies: int) -> None:
    print(f"rows={report['rows']}")
    print("\nTop issues:")
    for issue, count in report["issues"].most_common():
        print(f"  {issue}: {count}")

    print("\nCompany issue heatmap:")
    ranked = sorted(
        report["by_company"].items(),
        key=lambda kv: sum(kv[1].values()),
        reverse=True,
    )
    for company, stats in ranked[:top_companies]:
        print(f"\n- {company}")
        for issue, count in stats.most_common(8):
            print(f"    {issue}: {count}")

    print("\nExamples:")
    for issue, exs in report["examples"].items():
        print(f"\n## {issue}")
        for ex in exs:
            print(f"- {ex['company']} | {ex['title']} | {ex['apply_url']}")
            print(f"  shape={ex['shape']}")
            print(f"  snippet={ex['snippet']}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Read-only audit for vacancy description normalization")
    ap.add_argument("--input", default="", help="Path to local JSON array with vacancies")
    ap.add_argument("--from-supabase", action="store_true", help="Read rows from Supabase REST")
    ap.add_argument("--env-file", default="web/.env.local", help="Env file for Supabase credentials")
    ap.add_argument("--limit", type=int, default=0, help="Limit rows to analyze")
    ap.add_argument("--max-examples", type=int, default=3, help="Examples per issue")
    ap.add_argument("--top-companies", type=int, default=12, help="How many companies to print")
    ap.add_argument(
        "--stoplist",
        default="jetbrains,cian",
        help="Comma-separated company names to exclude from KPI (default: jetbrains,cian)",
    )
    args = ap.parse_args()

    rows: list[dict]
    if args.from_supabase:
        _load_env_from_file(args.env_file)
        rows = _fetch_rows_from_supabase(limit=args.limit)
    else:
        if not args.input:
            raise SystemExit("Provide --input for local JSON audit or use --from-supabase")
        rows = _read_json(args.input)
        if args.limit:
            rows = rows[: args.limit]

    stoplist = {x.strip().lower() for x in args.stoplist.split(",") if x.strip()}
    report = run_audit(rows, max_examples=args.max_examples, stoplist=stoplist)
    _print_report(report, top_companies=args.top_companies)


if __name__ == "__main__":
    main()

