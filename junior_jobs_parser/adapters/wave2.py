from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin, urlparse

from adapters.base import CompanyAdapter
from adapters.entry_level import is_entry_level_text, normalize_entry_level_vacancy
from adapters.types import Vacancy
from adapters.utils import apply_stealth, dedupe_vacancies, dismiss_cookie_plate, scroll_and_load_more
from exporter import detect_exp, detect_format, detect_sphere


@dataclass
class _AdapterConfig:
    company_name: str
    listing_urls: list[str]
    include_patterns: list[str]
    exclude_patterns: list[str]
    logo_url: str | None = None
    about: str | None = None


_SECTION_TITLE_RE = re.compile(
    r"^(все направления|управление командой|направления|категории|все вакансии)$",
    re.IGNORECASE,
)
_FILTER_PAGE_HINTS_RE = re.compile(
    r"график работы|опыт работы|направления|ключевые навыки|похожие вакансии|фильтр",
    re.IGNORECASE,
)
_CITY_RE = re.compile(
    r"\b(москва|санкт[- ]петербург|новосибирск|екатеринбург|казань|нижний новгород|"
    r"самара|омск|челябинск|краснодар|ростов-на-дону|удал[её]нно|remote)\b",
    re.IGNORECASE,
)


class _StructuredEntryAdapter(CompanyAdapter):
    company_name: str = ""
    config: _AdapterConfig

    def _collect_detail_urls(self, page, listing_url: str) -> list[str]:
        hrefs = page.evaluate(
            """() => Array.from(document.querySelectorAll('a[href]'))
              .map(a => a.getAttribute('href') || '')
              .filter(Boolean)"""
        )
        urls: set[str] = set()
        include = [re.compile(p, re.IGNORECASE) for p in self.config.include_patterns]
        exclude = [re.compile(p, re.IGNORECASE) for p in self.config.exclude_patterns]
        for href in hrefs or []:
            full = urljoin(listing_url, href.split("#")[0].split("?")[0]).rstrip("/")
            if not full:
                continue
            parsed = urlparse(full)
            if not parsed.netloc:
                continue
            if not any(p.search(full) for p in include):
                continue
            if any(p.search(full) for p in exclude):
                continue
            urls.add(full + "/")
        return sorted(urls)

    def _parse_detail(self, page, detail_url: str) -> Vacancy | None:
        try:
            page.goto(detail_url, wait_until="domcontentloaded", timeout=30_000)
        except Exception:
            return None
        page.wait_for_timeout(500)
        dismiss_cookie_plate(page)
        try:
            title = (page.locator("h1").first.inner_text(timeout=2500) or "").strip()
        except Exception:
            title = ""
        try:
            desc = (
                page.evaluate(
                    """() => {
                      const main = document.querySelector('main');
                      const node = main || document.body;
                      return (node && node.innerText ? node.innerText : '').trim();
                    }"""
                )
                or ""
            ).strip()
        except Exception:
            desc = ""
        if not title or len(desc.split()) < 20:
            return None
        if _SECTION_TITLE_RE.match(title):
            return None
        if _FILTER_PAGE_HINTS_RE.search(desc) and "обязанности" not in desc.lower():
            return None
        if not is_entry_level_text(title, desc):
            return None
        city = None
        m = _CITY_RE.search(desc)
        if m:
            city = m.group(1).title()
        payload = f"{title}\n{desc}"
        v = Vacancy(
            title=title,
            company=self.config.company_name,
            description=desc,
            apply_url=page.url or detail_url,
            source=self.config.listing_urls[0],
            url=page.url or detail_url,
            company_about=self.config.about,
            city=city,
            skills=[],
            company_logo_url=self.config.logo_url,
            sphere=detect_sphere(payload),
            exp=detect_exp(payload),
            format=detect_format(payload),
        )
        return normalize_entry_level_vacancy(v)

    def fetch(self, context, http) -> list[Vacancy]:
        debug = os.environ.get(f"{self.name.upper()}_ADAPTER_DEBUG", "").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        max_items = int(os.environ.get(f"{self.name.upper()}_ADAPTER_MAX_ITEMS", "30") or 30)
        out: list[Vacancy] = []
        detail_urls: list[str] = []

        list_page = context.new_page()
        apply_stealth(list_page)
        for listing_url in self.config.listing_urls:
            try:
                list_page.goto(listing_url, wait_until="domcontentloaded", timeout=45_000)
                dismiss_cookie_plate(list_page)
                scroll_and_load_more(list_page, max_loops=10)
                detail_urls.extend(self._collect_detail_urls(list_page, listing_url))
            except Exception:
                continue
        try:
            list_page.close()
        except Exception:
            pass

        if max_items > 0:
            detail_urls = detail_urls[:max_items]
        detail_urls = sorted(set(detail_urls))
        detail_page = context.new_page()
        apply_stealth(detail_page)
        for idx, detail_url in enumerate(detail_urls):
            v = self._parse_detail(detail_page, detail_url)
            if v:
                out.append(v)
            if debug:
                if idx == 0 or (idx + 1) % 10 == 0:
                    print(f"[{self.name}] detail {idx+1}/{len(detail_urls)} accepted={len(out)}", flush=True)
            time.sleep(0.12)
        try:
            detail_page.close()
        except Exception:
            pass
        return dedupe_vacancies(out)


class TwoGisAdapter(_StructuredEntryAdapter):
    name = "twogis"
    config = _AdapterConfig(
        company_name="2ГИС",
        listing_urls=["https://job.2gis.ru/"],
        include_patterns=[r"job\.2gis\.ru/.*/\d+$", r"job\.2gis\.ru/vacanc"],
        exclude_patterns=[r"/team/", r"/about/", r"/blog/"],
    )


class LamodaAdapter(_StructuredEntryAdapter):
    name = "lamoda"
    config = _AdapterConfig(
        company_name="Lamoda",
        listing_urls=["https://job.lamoda.ru/vacancies"],
        include_patterns=[r"job\.lamoda\.ru/.*/vacanc", r"job\.lamoda\.ru/vacancies/[^/]+$"],
        exclude_patterns=[r"/vacancies/?$", r"/blog/", r"/about/"],
    )


class SelectelAdapter(_StructuredEntryAdapter):
    name = "selectel"
    config = _AdapterConfig(
        company_name="Selectel",
        listing_urls=["https://selectel.ru/careers/all/"],
        include_patterns=[r"selectel\.ru/careers/.*/vacancy/\d+", r"careers\.selectel\.ru/.*/\d+"],
        exclude_patterns=[r"/all/?$", r"/career/?$"],
    )


class KonturAdapter(_StructuredEntryAdapter):
    name = "kontur"
    config = _AdapterConfig(
        company_name="Контур",
        listing_urls=["https://kontur.ru/career/vacancies"],
        include_patterns=[r"kontur\.ru/career/vacancies/\d+"],
        exclude_patterns=[r"/career/vacancies/?$"],
    )


class CloudRuAdapter(_StructuredEntryAdapter):
    name = "cloudru"
    config = _AdapterConfig(
        company_name="Cloud.ru",
        listing_urls=["https://cloud.ru/career/vacancies"],
        include_patterns=[r"cloud\.ru/career/vacancies/\d+"],
        exclude_patterns=[r"/career/vacancies/?$"],
    )


class PtsecurityAdapter(_StructuredEntryAdapter):
    name = "ptsecurity"
    config = _AdapterConfig(
        company_name="Positive Technologies",
        listing_urls=["https://ptsecurity.com/ru-ru/about/vacancy/"],
        include_patterns=[r"ptsecurity\.com/.*/about/vacancy/[^/]+/?$"],
        exclude_patterns=[r"/about/vacancy/?$"],
    )


class CianAdapter(_StructuredEntryAdapter):
    name = "cian"
    config = _AdapterConfig(
        company_name="ЦИАН",
        listing_urls=["https://www.cian.ru/vacancies/"],
        include_patterns=[r"cian\.ru/vacancies/\d+/?$"],
        exclude_patterns=[r"/vacancies/?$"],
    )


class DodoAdapter(_StructuredEntryAdapter):
    name = "dodo"
    config = _AdapterConfig(
        company_name="Dodo Engineering",
        listing_urls=["https://dodo.dev/jobs"],
        include_patterns=[r"dodo\.dev/jobs/[^/]+/?$", r"rabotavdodo\.ru/vacanc"],
        exclude_patterns=[r"/jobs/?$"],
    )


class MegafonAdapter(_StructuredEntryAdapter):
    name = "megafon"
    config = _AdapterConfig(
        company_name="МегаФон",
        listing_urls=["https://job.megafon.ru/"],
        include_patterns=[r"job\.megafon\.ru/vacancy/[^/]+/.+-\d+/?$"],
        exclude_patterns=[r"/vacancy/?$", r"/about/", r"/news/"],
    )


class CdekAdapter(_StructuredEntryAdapter):
    name = "cdek"
    config = _AdapterConfig(
        company_name="CDEK",
        listing_urls=["https://cdek-it.ru/", "https://rabota.cdek.ru/"],
        include_patterns=[r"cdek-it\.ru/.*/vacanc", r"rabota\.cdek\.ru/.*/vacan"],
        exclude_patterns=[r"rabota\.cdek\.ru/?$", r"/career/?$"],
    )
