from __future__ import annotations

import re
from typing import Any


_ROBOT_RE = re.compile(
    r"(вы не робот|похоже на автоматические запросы|captcha|cloudflare|access denied|forbidden)",
    re.IGNORECASE,
)
_JUNK_RE = re.compile(
    r"(условия использования|политика конфиденциальности|открыть в яндекс|рекомендовать друга|пропустить навигацию|похожие вакансии)",
    re.IGNORECASE,
)
_FORM_RE = re.compile(
    r"(\bфамилия\b|\bимя\b|\bтелефон\b|\be-?mail\b|\bпочта\b|прикрепить резюме|загрузить резюме|отправить резюме)",
    re.IGNORECASE,
)


def assess_quality(
    *,
    description: str | None,
    description_blocks: list[dict[str, Any]] | None,
    warnings: list[str] | None = None,
    source_text: str | None = None,
) -> dict[str, Any]:
    desc = (description or "").strip()
    blocks = description_blocks if isinstance(description_blocks, list) else []
    warn = list(dict.fromkeys(warnings or []))
    issues: list[str] = []
    score = 100

    if not desc:
        issues.append("empty_description")
        score -= 50
    if source_text and _ROBOT_RE.search(source_text):
        issues.append("source_robot_check")
        score -= 70
    if _ROBOT_RE.search(desc):
        issues.append("description_robot_check")
        score -= 70
    if _JUNK_RE.search(desc):
        issues.append("junk_leak")
        score -= 15
    if _FORM_RE.search(desc):
        issues.append("form_leak")
        score -= 15
    if not blocks:
        issues.append("no_blocks")
        score -= 35

    kinds = [str(b.get("kind", "")) for b in blocks if isinstance(b, dict)]
    if kinds.count("conditions") > 1:
        issues.append("duplicate_conditions")
        score -= 10
    if "tasks" not in kinds:
        issues.append("missing_tasks")
        score -= 15
    if "requirements" not in kinds:
        issues.append("missing_requirements")
        score -= 15

    for block in blocks:
        if not isinstance(block, dict):
            continue
        for item in (block.get("items") or []):
            if 0 < len(str(item).strip()) <= 10:
                issues.append("short_item")
                score -= 4
                break

    for w in warn:
        if w not in issues:
            issues.append(w)
            if w in {"missing_tasks", "missing_requirements", "form_leak", "junk_leak"}:
                score -= 5

    score = max(0, score)

    blocking = {
        "source_robot_check",
        "description_robot_check",
        "empty_description",
        "no_blocks",
    }
    if any(x in issues for x in blocking):
        status = "blocked"
    elif score >= 85:
        status = "ready"
    elif score >= 65:
        status = "needs_review"
    else:
        status = "source_failed"

    return {
        "quality_status": status,
        "quality_score": score,
        "quality_issues": sorted(set(issues)),
    }


def is_better_or_equal_quality(new_quality: dict[str, Any], old_quality: dict[str, Any]) -> bool:
    order = {"blocked": 0, "source_failed": 1, "needs_review": 2, "ready": 3}
    new_status = str(new_quality.get("quality_status") or "blocked")
    old_status = str(old_quality.get("quality_status") or "blocked")
    new_rank = order.get(new_status, 0)
    old_rank = order.get(old_status, 0)
    if new_rank != old_rank:
        return new_rank > old_rank
    return int(new_quality.get("quality_score") or 0) >= int(old_quality.get("quality_score") or 0)
