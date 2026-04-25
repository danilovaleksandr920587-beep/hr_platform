from __future__ import annotations

import os
import re
import time
from typing import Any

import requests

from adapters.base import CompanyAdapter
from adapters.entry_level import is_entry_level_text, normalize_entry_level_vacancy
from adapters.types import Vacancy
from adapters.utils import dedupe_vacancies
from exporter import detect_format, detect_sphere

LISTING_URL = "https://www.jetbrains.com/company/jobs/"
JOBS_API = "https://boards-api.greenhouse.io/v1/boards/jetbrains/jobs?content=true"
JETBRAINS_LOGO = "https://resources.jetbrains.com/storage/products/company/brand/logos/jetbrains.svg"
JETBRAINS_ABOUT = (
    "JetBrains создает инструменты для разработки ПО и платформы для команд. "
    "Компания нанимает инженеров и специалистов по продукту по всему миру."
)
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _clean(value: Any) -> str:
    if value is None:
        return ""
    text = _HTML_TAG_RE.sub(" ", str(value))
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _city_from_location(loc: dict[str, Any]) -> str | None:
    if not isinstance(loc, dict):
        return None
    parts = []
    for key in ("name",):
        value = _clean(loc.get(key) or "")
        if value:
            parts.append(value)
    city = ", ".join(parts)
    return city or None


class JetbrainsAdapter(CompanyAdapter):
    name = "jetbrains"
    listing_urls = [LISTING_URL]

    def fetch(self, context, http) -> list[Vacancy]:
        debug = os.environ.get("JETBRAINS_ADAPTER_DEBUG", "").strip().lower() in ("1", "true", "yes")
        max_items = int(os.environ.get("JETBRAINS_ADAPTER_MAX_ITEMS", "0") or 0)

        session = requests.Session()
        session.headers.update({
            "User-Agent": UA,
            "Accept": "application/json",
            "Referer": LISTING_URL,
        })

        try:
            resp = session.get(JOBS_API, timeout=25)
            if resp.status_code != 200:
                if debug:
                    print(f"[jetbrains] list status={resp.status_code}", flush=True)
                return []
            jobs = resp.json().get("jobs", [])
            if not isinstance(jobs, list):
                return []
        except Exception as exc:
            if debug:
                print(f"[jetbrains] list error: {exc}", flush=True)
            return []

        out: list[Vacancy] = []
        for idx, job in enumerate(jobs):
            title = _clean(job.get("title") or "")
            content = _clean(job.get("content") or "")
            text = f"{title}\n{content}"
            if not is_entry_level_text(title, content):
                continue
            if len(title) < 4 or len(content.split()) < 12:
                continue

            city = _city_from_location(job.get("location"))
            apply_url = _clean(job.get("absolute_url") or "") or LISTING_URL
            vacancy = Vacancy(
                title=title,
                company="JetBrains",
                description=content,
                apply_url=apply_url,
                source=LISTING_URL,
                url=apply_url,
                company_about=JETBRAINS_ABOUT,
                city=city,
                skills=[],
                source_published_at=_clean(job.get("updated_at") or "") or None,
                company_logo_url=JETBRAINS_LOGO,
                sphere=detect_sphere(text),
                format=detect_format(content),
            )
            out.append(normalize_entry_level_vacancy(vacancy))
            if debug and (idx == 0 or (idx + 1) % 25 == 0):
                print(f"[jetbrains] accepted {idx + 1}/{len(jobs)}: {title}", flush=True)
            if max_items > 0 and len(out) >= max_items:
                break
            time.sleep(0.03)

        return dedupe_vacancies(out)
