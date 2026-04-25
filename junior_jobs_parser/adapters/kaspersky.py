from __future__ import annotations

import os
import re
import time
from typing import Any
from urllib.parse import urljoin

import requests

from adapters.base import CompanyAdapter
from adapters.entry_level import is_entry_level_text, normalize_entry_level_vacancy
from adapters.types import Vacancy
from adapters.utils import dedupe_vacancies
from exporter import detect_format, detect_sphere

LISTING_URL = "https://careers.kaspersky.ru/vacancy"
LISTING_FALLBACK = "https://careers.kaspersky.ru/vacancies"
KASPERSKY_LOGO = "https://careers.kaspersky.ru/favicon.ico"
KASPERSKY_ABOUT = (
    "Лаборатория Касперского — международная технологическая компания в сфере "
    "кибербезопасности с вакансиями в разработке, аналитике и бизнес-направлениях."
)
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_VACANCY_URL_RE = re.compile(r"/vacancy/\d+")


def _clean(value: Any) -> str:
    if value is None:
        return ""
    text = str(value)
    text = re.sub(r"<script\\b[^>]*>.*?</script>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<style\\b[^>]*>.*?</style>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    text = _HTML_TAG_RE.sub("\n", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_city(text: str) -> str | None:
    for city in ("Москва", "Санкт-Петербург", "Новосибирск", "Казань", "Владивосток"):
        if city.lower() in text.lower():
            return city
    if "удал" in text.lower():
        return "Удаленно"
    return None


class KasperskyAdapter(CompanyAdapter):
    name = "kaspersky"
    listing_urls = [LISTING_URL]

    def fetch(self, context, http) -> list[Vacancy]:
        debug = os.environ.get("KASPERSKY_ADAPTER_DEBUG", "").strip().lower() in ("1", "true", "yes")
        max_items = int(os.environ.get("KASPERSKY_ADAPTER_MAX_ITEMS", "0") or 0)

        session = requests.Session()
        session.headers.update({
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Referer": LISTING_URL,
        })

        urls: set[str] = set()
        for listing in (LISTING_URL, LISTING_FALLBACK):
            try:
                r = session.get(listing, timeout=25)
                if r.status_code != 200:
                    continue
                for rel in _VACANCY_URL_RE.findall(r.text):
                    urls.add(urljoin(listing, rel))
            except Exception:
                continue

        if debug:
            print(f"[kaspersky] detail links: {len(urls)}", flush=True)

        out: list[Vacancy] = []
        for idx, detail_url in enumerate(sorted(urls)):
            try:
                resp = session.get(detail_url, timeout=25)
                if resp.status_code != 200:
                    continue
            except Exception:
                continue

            text = _clean(resp.text)
            lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
            if not lines:
                continue
            title = lines[0]
            description = text
            if "Остались вопросы?" in description:
                description = description.split("Остались вопросы?", 1)[0].strip()
            if "Откликнуться на вакансию" in description:
                description = description.split("Откликнуться на вакансию", 1)[0].strip()
            if len(title) < 4 or len(description.split()) < 20:
                continue
            if not is_entry_level_text(title, description):
                continue

            payload = f"{title}\n{description}"
            vacancy = Vacancy(
                title=title,
                company="Лаборатория Касперского",
                description=description,
                apply_url=detail_url,
                source=LISTING_URL,
                url=detail_url,
                company_about=KASPERSKY_ABOUT,
                city=_extract_city(description),
                skills=[],
                company_logo_url=KASPERSKY_LOGO,
                sphere=detect_sphere(payload),
                format=detect_format(description),
            )
            out.append(normalize_entry_level_vacancy(vacancy))
            if debug and (idx == 0 or (idx + 1) % 10 == 0):
                print(f"[kaspersky] accepted {idx + 1}/{len(urls)}: {title}", flush=True)
            if max_items > 0 and len(out) >= max_items:
                break
            time.sleep(0.04)

        return dedupe_vacancies(out)
