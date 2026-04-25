from __future__ import annotations

import re

from adapters.types import Vacancy
from exporter import detect_exp

_POSITIVE_RE = re.compile(
    r"стаж[её]р|стажировк|\bintern(?:ship)?\b|trainee|практикант|"
    r"\bjunior\b|джуниор|джун|младш|начинающ|entry[\s-]?level|"
    r"без опыта|до 1 года|1[\s\-–]?3\s*года|1[\s\-–]?3\s*лет|"
    r"graduate|assistant",
    re.IGNORECASE,
)
_NEGATIVE_RE = re.compile(
    r"\b(senior|lead|principal|staff|head\s+of|руководител|начальник|"
    r"ведущ|главн)\b|от\s*3\s*лет|3\+\s*лет|5\+\s*лет|более\s*3\s*лет",
    re.IGNORECASE,
)
_MIDDLE_RE = re.compile(r"\bmiddle\b|мидл", re.IGNORECASE)


def is_entry_level_text(title: str, description: str) -> bool:
    text = f"{title or ''}\n{description or ''}".strip()
    if not text:
        return False
    if _NEGATIVE_RE.search(text):
        return False
    if _MIDDLE_RE.search(text) and not _POSITIVE_RE.search(text):
        return False
    exp = detect_exp(text)
    if exp in ("none", "lt1", "1-3"):
        return True
    return bool(_POSITIVE_RE.search(text))


def normalize_entry_level_vacancy(v: Vacancy) -> Vacancy:
    text = f"{v.title or ''}\n{v.description or ''}"
    exp = detect_exp(text)
    if exp not in ("none", "lt1", "1-3"):
        # Guardrail: keep model-compatible values only.
        exp = "lt1"
    v.exp = exp
    v.employment_type = "internship"
    return v
