from __future__ import annotations

import json
import os
import re
import time
from typing import Any
from urllib.parse import urljoin

from adapters.base import CompanyAdapter
from adapters.entry_level import is_entry_level_text, normalize_entry_level_vacancy
from adapters.types import Vacancy
from adapters.utils import apply_stealth, dedupe_vacancies, dismiss_cookie_plate
from exporter import detect_format, detect_sphere

VK_COMPANY_ABOUT = (
    "VK развивает коммуникационные, развлекательные, образовательные и бизнес-сервисы "
    "для миллионов пользователей и компаний."
)
VK_LOGO = "https://vk.company/favicon.ico"
LISTING_URL = "https://team.vk.company/"


def _clean(text: Any) -> str:
    if text is None:
        return ""
    t = str(text)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def _collect_vacancy_urls(page) -> list[str]:
    hrefs = page.evaluate(
        """() => {
            const out = new Set();
            for (const a of document.querySelectorAll('a[href*="/vacancy/"]')) {
                const h = a.getAttribute('href') || '';
                if (/\\/vacancy\\/\\d+\\/?/.test(h)) out.add(h);
            }
            return Array.from(out);
        }"""
    )
    urls: set[str] = set()
    for h in hrefs or []:
        full = urljoin(LISTING_URL, h).split("?")[0].rstrip("/") + "/"
        if re.search(r"/vacancy/\d+/$", full):
            urls.add(full)
    return sorted(urls)


def _json_ld_job(page) -> dict[str, Any] | None:
    try:
        scripts = page.evaluate(
            """() => Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                .map(s => s.textContent || '').filter(Boolean)"""
        )
    except Exception:
        return None
    for raw in scripts or []:
        try:
            data = json.loads(raw)
        except Exception:
            continue
        candidates = data if isinstance(data, list) else [data]
        for item in candidates:
            if isinstance(item, dict) and item.get("@type") == "JobPosting":
                return item
    return None


def _trim_vk_text(text: str, title: str) -> str:
    t = _clean(text)
    if title and t.startswith(title):
        t = _clean(t[len(title) :])
    for marker in (
        "\nОткликнуться",
        "\nПоделиться",
        "\nПохожие вакансии",
        "\nВсе вакансии",
        "\n©",
    ):
        idx = t.find(marker)
        if idx > 300:
            t = t[:idx]
    return _clean(t)


def _parse_detail(page, url: str) -> Vacancy | None:
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=35_000)
    except Exception:
        return None
    page.wait_for_timeout(700)
    dismiss_cookie_plate(page)

    jp = _json_ld_job(page)
    title = _clean((jp or {}).get("title") or (jp or {}).get("name"))
    if not title:
        try:
            title = _clean(page.locator("h1").first.inner_text(timeout=4000))
        except Exception:
            title = ""

    desc = _clean((jp or {}).get("description"))
    if len(desc.split()) < 30:
        for sel in ("main", "article", "[class*='Vacancy']", "body"):
            try:
                blob = _clean(page.locator(sel).first.inner_text(timeout=2500))
                if len(blob) > len(desc):
                    desc = blob
            except Exception:
                continue
    desc = _trim_vk_text(desc, title)
    if len(title) < 4 or len(desc.split()) < 20:
        return None
    if not is_entry_level_text(title, desc):
        return None

    city = None
    if jp:
        loc = jp.get("jobLocation")
        if isinstance(loc, dict):
            addr = loc.get("address")
            if isinstance(addr, dict) and isinstance(addr.get("addressLocality"), str):
                city = addr["addressLocality"].strip() or None
        elif isinstance(loc, list):
            cities = []
            for item in loc:
                if isinstance(item, dict):
                    addr = item.get("address")
                    if isinstance(addr, dict) and isinstance(addr.get("addressLocality"), str):
                        cities.append(addr["addressLocality"].strip())
            city = ", ".join([c for c in cities if c]) or None

    vacancy = Vacancy(
        title=title,
        company="VK",
        description=desc,
        apply_url=page.url or url,
        source=LISTING_URL,
        url=page.url or url,
        company_about=VK_COMPANY_ABOUT,
        city=city,
        skills=[],
        source_published_at=(jp or {}).get("datePosted") if jp else None,
        company_logo_url=VK_LOGO,
        sphere=detect_sphere(f"{title}\n{desc}"),
        format=detect_format(desc),
    )
    return normalize_entry_level_vacancy(vacancy)


class VkAdapter(CompanyAdapter):
    name = "vk"
    listing_urls = [LISTING_URL]

    def fetch(self, context, http) -> list[Vacancy]:
        debug = os.environ.get("VK_ADAPTER_DEBUG", "").strip().lower() in ("1", "true", "yes")
        max_urls = int(os.environ.get("VK_ADAPTER_MAX_URLS", "0") or 0)

        page = context.new_page()
        apply_stealth(page)
        try:
            page.goto(LISTING_URL, wait_until="domcontentloaded", timeout=60_000)
            dismiss_cookie_plate(page)
            page.wait_for_timeout(1500)
            for _ in range(6):
                page.evaluate("window.scrollTo(0, document.body ? document.body.scrollHeight : 0)")
                page.wait_for_timeout(700)
            urls = _collect_vacancy_urls(page)
        except Exception:
            urls = []
        finally:
            page.close()

        if max_urls > 0:
            urls = urls[:max_urls]
        if debug:
            print(f"[vk] detail urls: {len(urls)}", flush=True)

        detail = context.new_page()
        apply_stealth(detail)
        out: list[Vacancy] = []
        for i, url in enumerate(urls):
            if debug and (i == 0 or (i + 1) % 10 == 0):
                print(f"[vk] detail {i + 1}/{len(urls)}: {url}", flush=True)
            v = _parse_detail(detail, url)
            if v:
                out.append(v)
            time.sleep(0.15)
        detail.close()
        return dedupe_vacancies(out)
