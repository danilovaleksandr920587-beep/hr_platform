from __future__ import annotations

import os
import time

from adapters.base import CompanyAdapter
from adapters.entry_level import is_entry_level_text, normalize_entry_level_vacancy
from adapters.types import Vacancy
from adapters.utils import dedupe_vacancies, fetch_generic_site
from exporter import detect_format, detect_sphere


class _GenericEntryAdapter(CompanyAdapter):
    company_name: str = ""
    company_about: str | None = None
    company_logo_url: str | None = None

    def fetch(self, context, http) -> list[Vacancy]:
        debug = os.environ.get(f"{self.name.upper()}_ADAPTER_DEBUG", "").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        max_items = int(os.environ.get(f"{self.name.upper()}_ADAPTER_MAX_ITEMS", "0") or 0)

        out: list[Vacancy] = []
        for listing_url in self.listing_urls:
            try:
                raw = fetch_generic_site(context, listing_url, self.company_name)
            except Exception:
                raw = []
            for v in raw:
                title = (v.title or "").strip()
                desc = (v.description or "").strip()
                if len(title) < 4 or len(desc.split()) < 8:
                    continue
                if not is_entry_level_text(title, desc):
                    continue
                payload = f"{title}\n{desc}"
                v.company = self.company_name
                v.source = listing_url
                v.url = v.url or v.apply_url or listing_url
                v.apply_url = v.apply_url or v.url or listing_url
                v.company_about = v.company_about or self.company_about
                v.company_logo_url = v.company_logo_url or self.company_logo_url
                v.sphere = v.sphere or detect_sphere(payload)
                v.format = v.format or detect_format(desc)
                out.append(normalize_entry_level_vacancy(v))
                if max_items > 0 and len(out) >= max_items:
                    return dedupe_vacancies(out)
            if debug:
                print(f"[{self.name}] from {listing_url}: accepted={len(out)}", flush=True)
            time.sleep(0.2)
        return dedupe_vacancies(out)


class TwoGisAdapter(_GenericEntryAdapter):
    name = "twogis"
    company_name = "2ГИС"
    listing_urls = ["https://job.2gis.ru/"]


class LamodaAdapter(_GenericEntryAdapter):
    name = "lamoda"
    company_name = "Lamoda"
    listing_urls = ["https://job.lamoda.ru/vacancies"]


class SelectelAdapter(_GenericEntryAdapter):
    name = "selectel"
    company_name = "Selectel"
    listing_urls = ["https://selectel.ru/careers/all/"]


class KonturAdapter(_GenericEntryAdapter):
    name = "kontur"
    company_name = "Контур"
    listing_urls = ["https://kontur.ru/career/vacancies"]


class CloudRuAdapter(_GenericEntryAdapter):
    name = "cloudru"
    company_name = "Cloud.ru"
    listing_urls = ["https://cloud.ru/career/vacancies"]


class PtsecurityAdapter(_GenericEntryAdapter):
    name = "ptsecurity"
    company_name = "Positive Technologies"
    listing_urls = ["https://ptsecurity.com/ru-ru/about/vacancy/"]


class CianAdapter(_GenericEntryAdapter):
    name = "cian"
    company_name = "ЦИАН"
    listing_urls = ["https://www.cian.ru/vacancies/"]


class DodoAdapter(_GenericEntryAdapter):
    name = "dodo"
    company_name = "Dodo Engineering"
    listing_urls = ["https://dodo.dev/jobs"]


class MegafonAdapter(_GenericEntryAdapter):
    name = "megafon"
    company_name = "МегаФон"
    listing_urls = ["https://job.megafon.ru/"]


class CdekAdapter(_GenericEntryAdapter):
    name = "cdek"
    company_name = "CDEK"
    listing_urls = ["https://cdek-it.ru/", "https://rabota.cdek.ru/"]
