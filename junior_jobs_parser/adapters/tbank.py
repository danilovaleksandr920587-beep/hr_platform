"""
Т-Банк careers — listing через Playwright: перехват JSON (hrsites / pfpjobs papi)
и ссылки /career/.../vacancy/.../{uuid}/, затем при необходимости догрузка детальной страницы.

Опционально:
  TBANK_ADAPTER_MAX_URLS=N — ограничить число детальных заходов (smoke).
  TBANK_ADAPTER_DEBUG=1 — лог по листингу.
"""

from __future__ import annotations

import json
import os
import re
import time
from typing import Any
from urllib.parse import urljoin, urlparse

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

from adapters.base import CompanyAdapter
from adapters.entry_level import is_entry_level_text, normalize_entry_level_vacancy
from adapters.types import Vacancy
from adapters.utils import (
    apply_stealth,
    dedupe_vacancies,
    dismiss_cookie_plate,
    parse_jobs_from_json,
    safe_goto,
    scroll_and_load_more,
)
from exporter import detect_format, detect_sphere

TBANK_COMPANY = "Т-Банк"
TBANK_LOGO = "https://cdn.tbank.ru/static/pfa-multimedia/images/33447f85-5b92-42f9-8d88-509bd152b47c.svg"
LISTING_URLS = [
    "https://www.tbank.ru/career/vacancies/students/",
    "https://www.tbank.ru/career/vacancies/back-office/",
    "https://www.tbank.ru/career/vacancies/it/",
]
# Деталь: /career/{направление}/vacancy/{город}/{slug}/{uuid}/
_RE_VACANCY_PATH = re.compile(
    r"/career/[^/]+/vacancy/[^/]+/[^/]+/[a-f0-9-]{36}/?",
    re.IGNORECASE,
)


def _apply_key(url: str) -> str:
    return (url or "").strip().lower().split("?")[0].rstrip("/") + "/"


def _normalize_vacancy_url(href: str, base: str = "https://www.tbank.ru") -> str | None:
    if not href or not isinstance(href, str):
        return None
    href = href.split("?")[0].split("#")[0].strip()
    if href.startswith("//"):
        href = "https:" + href
    full = urljoin(base + "/", href)
    if "tbank.ru" not in urlparse(full).netloc.lower():
        return None
    path = urlparse(full).path
    if not _RE_VACANCY_PATH.search(path + ("/" if not path.endswith("/") else "")):
        return None
    out = full.split("?")[0].rstrip("/") + "/"
    return out


def _collect_vacancy_urls_dom(page) -> set[str]:
    hrefs = page.evaluate(
        """() => {
            const out = new Set();
            for (const a of document.querySelectorAll('a[href]')) {
                const h = a.getAttribute('href') || '';
                if (h.includes('/career/') && h.includes('/vacancy/')) out.add(h);
            }
            return Array.from(out);
        }"""
    )
    out: set[str] = set()
    for h in hrefs or []:
        u = _normalize_vacancy_url(h)
        if u:
            out.add(u)
    return out


def _should_capture_response_url(url: str) -> bool:
    u = url.lower()
    if "hrsites-api-vacancies.tbank.ru" in u:
        return True
    if "tbank.ru/pfpjobs/papi" in u or "tinkoff.ru/pfpjobs/papi" in u:
        return True
    if "tbank.ru" in u and "vacanc" in u and ("json" in u or u.endswith(".json")):
        return True
    return False


def _vacancies_from_json_root(root: Any, listing_url: str) -> list[Vacancy]:
    if isinstance(root, dict):
        return parse_jobs_from_json(root, listing_url, TBANK_COMPANY)
    if isinstance(root, list):
        merged: list[Vacancy] = []
        for chunk in root:
            merged.extend(_vacancies_from_json_root(chunk, listing_url))
        return merged
    return []


def _vacancies_from_network_payloads(
    payloads: list[Any], listing_url: str
) -> dict[str, Vacancy]:
    by_apply: dict[str, Vacancy] = {}
    for p in payloads:
        for v in _vacancies_from_json_root(p, listing_url):
            au = (v.apply_url or "").strip().lower()
            if "/vacancy/" not in au:
                continue
            if "tbank.ru" not in au:
                continue
            key = _apply_key(v.apply_url or "")
            by_apply[key] = v
    return by_apply


def _word_count(text: str) -> int:
    return len((text or "").split())


def _title_guess_from_url(url: str) -> str:
    try:
        parts = [p for p in urlparse(url).path.split("/") if p]
        if len(parts) >= 2:
            slug = parts[-2]
            if len(slug) > 2 and not re.fullmatch(
                r"[a-f0-9-]{36}", slug, flags=re.IGNORECASE
            ):
                return re.sub(r"[-_]+", " ", slug).strip().title() or "Вакансия"
    except Exception:
        pass
    return "Вакансия Т-Банка"


def _trim_tbank_body(text: str, title: str) -> str:
    t = (text or "").strip()
    if not t:
        return t
    cuts = (
        "\nПохожие вакансии",
        "\nДругие вакансии",
        "\nВсе вакансии",
        "\nМы в соцсетях",
        "\nПодписаться на рассылку",
        "\nПолитика обработки",
        "\nПропустить навигацию",
    )
    for c in cuts:
        i = t.find(c)
        if i > 400:
            t = t[:i]
    if title:
        # иногда заголовок дублируется в начале main
        prefix = title.strip() + "\n"
        if t.startswith(prefix):
            t = t[len(prefix) :].strip()
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def _parse_detail_page(page, detail_url: str, listing_url: str) -> Vacancy | None:
    try:
        # T-Bank pages keep background requests open; waiting for networkidle makes
        # detail parsing unnecessarily slow.
        page.goto(detail_url, wait_until="domcontentloaded", timeout=25_000)
    except PlaywrightTimeoutError:
        return None
    except Exception:
        return None
    dismiss_cookie_plate(page)
    page.wait_for_timeout(700)

    title = ""
    try:
        title = (page.locator("h1").first.inner_text(timeout=5000) or "").strip()
    except Exception:
        pass
    if not title:
        try:
            og = page.locator('meta[property="og:title"]').first.get_attribute("content")
            title = (og or "").strip()
        except Exception:
            title = ""

    description = ""
    jp_list: list[dict[str, Any]] = []
    try:
        raw = page.evaluate(
            """() => {
                const out = [];
                for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
                    const t = (s.textContent || '').trim();
                    if (t) out.push(t);
                }
                return out;
            }"""
        )
        for text in raw or []:
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                continue
            if isinstance(data, dict) and data.get("@type") == "JobPosting":
                jp_list.append(data)
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get("@type") == "JobPosting":
                        jp_list.append(item)
    except Exception:
        pass

    jp = jp_list[0] if jp_list else None
    if jp and isinstance(jp.get("description"), str):
        description = (jp.get("description") or "").strip()

    if len(description) < 120:
        try:
            blob = page.evaluate(
                """() => {
                    const m = document.querySelector('main');
                    return (m && m.innerText ? m.innerText : (document.body && document.body.innerText) || '').trim();
                }"""
            )
            blob = _trim_tbank_body(str(blob or ""), title)
            if len(blob) > len(description):
                description = blob
        except Exception:
            pass

    description = _trim_tbank_body(description, title)
    final_url = page.url or detail_url

    if len(title) < 4 or _word_count(description) < 8:
        return None
    if not is_entry_level_text(title, description):
        return None

    city = None
    skills: list[str] = []
    salary = None
    pub = None
    company_about = None

    if jp:
        loc = jp.get("jobLocation")
        if isinstance(loc, dict):
            addr = loc.get("address")
            if isinstance(addr, dict) and isinstance(addr.get("addressLocality"), str):
                city = addr["addressLocality"].strip() or None
        org = jp.get("hiringOrganization")
        if isinstance(org, dict) and isinstance(org.get("description"), str):
            ca = org["description"].strip()
            if len(ca) > 40:
                company_about = ca
        if isinstance(jp.get("datePosted"), str):
            pub = jp["datePosted"].strip()
        bs = jp.get("skills") or jp.get("qualifications")
        if isinstance(bs, str) and bs.strip():
            skills = [x.strip() for x in re.split(r"[,;•]", bs) if x.strip()][:40]

    if not city:
        parts = [p for p in urlparse(final_url).path.split("/") if p]
        if len(parts) >= 4 and parts[2] == "vacancy":
            city = parts[3].replace("-", " ").title()

    vacancy = Vacancy(
        title=title,
        company=TBANK_COMPANY,
        description=description,
        apply_url=final_url,
        source=listing_url,
        url=final_url,
        company_about=company_about,
        city=city,
        skills=skills,
        source_published_at=pub,
        company_logo_url=TBANK_LOGO,
        salary=salary,
        format=detect_format(description),
        sphere=detect_sphere(f"{title}\n{description}"),
    )
    return normalize_entry_level_vacancy(vacancy)


def _fetch_one_listing(context, listing_url: str) -> list[Vacancy]:
    _dbg = os.environ.get("TBANK_ADAPTER_DEBUG", "").strip().lower() in ("1", "true", "yes")
    network_payloads: list[Any] = []

    def on_response(resp) -> None:
        try:
            if not _should_capture_response_url(resp.url):
                return
            ct = (resp.headers.get("content-type") or "").lower()
            if "json" not in ct:
                return
            network_payloads.append(resp.json())
        except Exception:
            return

    page = context.new_page()
    apply_stealth(page)
    page.on("response", on_response)
    if _dbg:
        print(f"[tbank] goto {listing_url}", flush=True)
    if not safe_goto(page, listing_url, timeout_sec=90):
        page.remove_listener("response", on_response)
        page.close()
        return []

    dismiss_cookie_plate(page)
    scroll_and_load_more(page, max_loops=18)
    page.wait_for_timeout(1800)
    page.remove_listener("response", on_response)

    dom_urls = _collect_vacancy_urls_dom(page)
    page.close()

    if _dbg:
        print(
            f"[tbank] sniffed JSON responses: {len(network_payloads)}, dom vacancy links: {len(dom_urls)}",
            flush=True,
        )

    by_apply = _vacancies_from_network_payloads(network_payloads, listing_url)
    min_words = int(os.environ.get("VACANCY_MIN_DESC_WORDS", "32") or 32)

    for u in dom_urls:
        key = _apply_key(u)
        if key not in by_apply:
            by_apply[key] = Vacancy(
                title=_title_guess_from_url(u),
                company=TBANK_COMPANY,
                description="",
                apply_url=u,
                source=listing_url,
                url=u,
                company_logo_url=TBANK_LOGO,
            )

    max_urls = int(os.environ.get("TBANK_ADAPTER_MAX_URLS", "0") or 0)
    url_list = sorted(by_apply.keys())
    if max_urls > 0:
        url_list = url_list[:max_urls]

    detail = context.new_page()
    apply_stealth(detail)
    out: list[Vacancy] = []

    for i, key in enumerate(url_list):
        v0 = by_apply.get(key)
        if not v0:
            continue
        if _dbg and (i == 0 or (i + 1) % 10 == 0):
            print(f"[tbank] detail {i + 1}/{len(url_list)}: {v0.apply_url}", flush=True)
        need = _word_count(v0.description) < min_words or len((v0.title or "").strip()) < 6
        if need:
            v = _parse_detail_page(detail, v0.apply_url or key, listing_url)
            if v:
                out.append(v)
        else:
            if not is_entry_level_text(v0.title or "", v0.description or ""):
                continue
            v0.company = TBANK_COMPANY
            if not v0.company_logo_url:
                v0.company_logo_url = TBANK_LOGO
            v0.format = v0.format or detect_format(v0.description or "")
            v0.sphere = v0.sphere or detect_sphere(f"{v0.title or ''}\n{v0.description or ''}")
            out.append(normalize_entry_level_vacancy(v0))
        if (i + 1) % 25 == 0:
            time.sleep(0.45)
        else:
            time.sleep(0.12)

    try:
        detail.close()
    except Exception:
        pass

    if _dbg:
        print(f"[tbank] built vacancies: {len(out)}", flush=True)
    return out


class TbankAdapter(CompanyAdapter):
    name = "tbank"
    listing_urls = LISTING_URLS

    def fetch(self, context, http) -> list[Vacancy]:
        items: list[Vacancy] = []
        for url in self.listing_urls:
            items.extend(_fetch_one_listing(context, url))
        return dedupe_vacancies(items)
