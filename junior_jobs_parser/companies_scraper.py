"""
Collect vacancies from selected company career websites (top-10 adapters).

Examples:
  python3 companies_scraper.py
  python3 companies_scraper.py --only sber,tbank,yandex
  python3 companies_scraper.py --force-headed --output companies_vacancies_enriched.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from adapters import (
    AlfaAdapter,
    AvitoAdapter,
    JetbrainsAdapter,
    KasperskyAdapter,
    MtsAdapter,
    OzonAdapter,
    SamokatAdapter,
    SberAdapter,
    TbankAdapter,
    TwoGisAdapter,
    VkAdapter,
    WildberriesAdapter,
    X5Adapter,
    YandexAdapter,
    LamodaAdapter,
    SelectelAdapter,
    KonturAdapter,
    CloudRuAdapter,
    PtsecurityAdapter,
    CianAdapter,
    DodoAdapter,
    MegafonAdapter,
    CdekAdapter,
)
from adapters.entry_level import is_entry_level_text, normalize_entry_level_vacancy
from adapters.types import Vacancy
from adapters.utils import (
    close_browser_context,
    dedupe_vacancies,
    is_valid_vacancy,
    launch_browser_context,
)
from exporter import convert_vacancy
from parser import is_spam_vacancy


ADAPTERS = {
    "alfa": AlfaAdapter,
    "sber": SberAdapter,
    "tbank": TbankAdapter,
    "yandex": YandexAdapter,
    "vk": VkAdapter,
    "avito": AvitoAdapter,
    "ozon": OzonAdapter,
    "wildberries": WildberriesAdapter,
    "mts": MtsAdapter,
    "samokat": SamokatAdapter,
    "x5": X5Adapter,
    "jetbrains": JetbrainsAdapter,
    "kaspersky": KasperskyAdapter,
    "twogis": TwoGisAdapter,
    "lamoda": LamodaAdapter,
    "selectel": SelectelAdapter,
    "kontur": KonturAdapter,
    "cloudru": CloudRuAdapter,
    "ptsecurity": PtsecurityAdapter,
    "cian": CianAdapter,
    "dodo": DodoAdapter,
    "megafon": MegafonAdapter,
    "cdek": CdekAdapter,
}

def _is_internship_like(v: Vacancy) -> bool:
    if v.employment_type == "internship" and v.exp in ("none", "lt1", "1-3"):
        return True
    return is_entry_level_text(v.title or "", v.description or "")


def _filter_vacancies(
    items: list[Vacancy], internships_only: bool = False, entry_level_only: bool = False
) -> list[Vacancy]:
    out: list[Vacancy] = []
    for v in items:
        text = (v.title or "") + "\n" + (v.description or "")
        if is_spam_vacancy(text):
            continue
        if not is_valid_vacancy(v):
            continue
        if (internships_only or entry_level_only) and not _is_internship_like(v):
            continue
        if internships_only or entry_level_only:
            normalize_entry_level_vacancy(v)
        out.append(v)
    return out


def _parse_only(value: str | None) -> list[str]:
    if not value:
        return list(ADAPTERS.keys())
    parts = [x.strip().lower() for x in value.split(",") if x.strip()]
    return [p for p in parts if p in ADAPTERS]


def run(
    only: list[str],
    output: str,
    force_headed: bool,
    internships_only: bool = False,
    entry_level_only: bool = False,
) -> tuple[int, int]:
    pw, browser, context = launch_browser_context(force_headed=force_headed)
    raw: list[Vacancy] = []
    try:
        for name in only:
            adapter = ADAPTERS[name]()
            print(f"[{name}] start", flush=True)
            try:
                items = adapter.fetch(context=context, http=None)
            except Exception as exc:
                print(f"[{name}] error: {exc}")
                items = []
            n = len(items)
            passed = 0
            internship_passed = 0
            for v in items:
                text = (v.title or "") + "\n" + (v.description or "")
                if is_spam_vacancy(text):
                    continue
                if is_valid_vacancy(v):
                    passed += 1
                    if _is_internship_like(v):
                        internship_passed += 1
            rejected = n - passed
            print(
                f"[{name}] collected: {n} "
                f"(would_pass_spam+validation: {passed}, internships_like: {internship_passed}, "
                f"rejected: {rejected})",
                flush=True,
            )
            raw.extend(items)
    finally:
        close_browser_context(pw, browser, context)

    unique = dedupe_vacancies(raw)
    filtered = _filter_vacancies(
        unique,
        internships_only=internships_only,
        entry_level_only=entry_level_only,
    )
    rows = [convert_vacancy(v.to_dict()) for v in filtered]

    out_path = Path(output)
    out_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"saved: {out_path.resolve()}", flush=True)
    print(
        f"raw={len(raw)} unique={len(unique)} filtered={len(filtered)} "
        f"ready={len(rows)} (internships_only={internships_only}, "
        f"entry_level_only={entry_level_only}, "
        f"rejected_after_dedupe={len(unique) - len(filtered)})",
        flush=True,
    )
    return len(rows), len(raw)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="Comma-separated adapters: sber,tbank,...")
    ap.add_argument(
        "--output",
        default="companies_vacancies_enriched.json",
        help="Output JSON for uploader.py",
    )
    ap.add_argument("--force-headed", action="store_true")
    ap.add_argument(
        "--internships-only",
        action="store_true",
        help="Keep only internships / junior / entry-level vacancies and drop middle/senior/lead roles.",
    )
    ap.add_argument(
        "--entry-level-only",
        action="store_true",
        help="Keep only entry-level vacancies (intern/junior/lt1/1-3) and normalize employment_type.",
    )
    args = ap.parse_args()

    only = _parse_only(args.only)
    if not only:
        raise SystemExit("No valid adapters selected.")
    run(
        only=only,
        output=args.output,
        force_headed=args.force_headed,
        internships_only=args.internships_only,
        entry_level_only=args.entry_level_only,
    )


if __name__ == "__main__":
    main()
