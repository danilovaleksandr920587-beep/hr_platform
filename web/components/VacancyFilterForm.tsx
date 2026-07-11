"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EXP_LABELS,
  FORMAT_LABELS,
  SPHERE_LABELS,
  TYPE_LABELS,
  type FilterOption,
} from "@/lib/vacancy-labels";

const DEFAULT_SPHERES: FilterOption[] = Object.entries(SPHERE_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const DEFAULT_EXPS: FilterOption[] = Object.entries(EXP_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const DEFAULT_FORMATS: FilterOption[] = Object.entries(FORMAT_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const DEFAULT_TYPES: FilterOption[] = Object.entries(TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

function mergeOptions(base: FilterOption[], dynamic?: FilterOption[]): FilterOption[] {
  if (!dynamic?.length) return base;
  const byValue = new Map<string, FilterOption>();
  for (const item of base) byValue.set(item.value, item);
  for (const item of dynamic) {
    byValue.set(item.value, { ...byValue.get(item.value), ...item });
  }
  const merged: FilterOption[] = [];
  for (const item of base) {
    const v = byValue.get(item.value);
    if (v) {
      merged.push(v);
      byValue.delete(item.value);
    }
  }
  merged.push(...Array.from(byValue.values()));
  return merged;
}

export type VacancyFilterSelected = {
  sphere: string[];
  city: string[];
  exp: string[];
  format: string[];
  type: string[];
  salaryFrom: string;
  salaryTo: string;
  q: string;
};

type Props = {
  selected: VacancyFilterSelected;
  options?: {
    sphere?: FilterOption[];
    city?: FilterOption[];
    exp?: FilterOption[];
    format?: FilterOption[];
    type?: FilterOption[];
  };
  /** Кол-во найденных вакансий - для мобильной кнопки «Показать N». */
  resultCount?: number;
  /** Просклонённое «вакансия/вакансии/вакансий» под resultCount. */
  resultNoun?: string;
};

function countActive(f: VacancyFilterSelected): number {
  return (
    f.sphere.length +
    f.city.length +
    f.exp.length +
    f.format.length +
    f.type.length +
    (f.salaryFrom.trim() ? 1 : 0) +
    (f.salaryTo.trim() ? 1 : 0)
  );
}

function toggleInList(list: string[], value: string): string[] {
  const set = new Set(list);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

function filtersToSearchParams(f: VacancyFilterSelected): URLSearchParams {
  const p = new URLSearchParams();
  for (const v of f.sphere) p.append("sphere", v);
  for (const v of f.city) p.append("city", v);
  for (const v of f.exp) p.append("exp", v);
  for (const v of f.format) p.append("format", v);
  for (const v of f.type) p.append("type", v);
  const sf = f.salaryFrom.trim();
  const st = f.salaryTo.trim();
  if (sf) p.set("salary_from", sf);
  if (st) p.set("salary_to", st);
  const q = f.q.trim();
  if (q) p.set("q", q);
  return p;
}

export function VacancyFilterForm({
  selected,
  options,
  resultCount,
  resultNoun,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  const activeCount = countActive(selected);

  // Блокируем скролл фона, пока шторка открыта (только моб.).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Закрытие по Esc.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const spheres = mergeOptions(DEFAULT_SPHERES, options?.sphere);
  const cities = options?.city?.length ? options.city : [];
  const exps = mergeOptions(DEFAULT_EXPS, options?.exp);
  const formats = mergeOptions(DEFAULT_FORMATS, options?.format);
  const types = mergeOptions(DEFAULT_TYPES, options?.type);

  const pushFilters = useCallback(
    (next: VacancyFilterSelected) => {
      const params = filtersToSearchParams(next);
      const qs = params.toString();
      router.push(qs ? `/vacancies?${qs}` : "/vacancies", { scroll: false });
    },
    [router],
  );

  const pushSalaryFromForm = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const from = String(fd.get("salary_from") ?? "").trim();
    const to = String(fd.get("salary_to") ?? "").trim();
    pushFilters({
      ...selected,
      salaryFrom: from,
      salaryTo: to,
    });
  }, [pushFilters, selected]);

  return (
    <>
      <div className="filter-trigger-bar">
        <button
          type="button"
          className="filter-trigger-btn"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="filter-trigger-icon" aria-hidden="true">
            ⚙
          </span>
          <span>Фильтры</span>
          {activeCount > 0 ? (
            <span className="filter-trigger-count">{activeCount}</span>
          ) : null}
        </button>
        {activeCount > 0 ? (
          <Link className="filter-trigger-reset" href="/vacancies" scroll={false}>
            Сбросить
          </Link>
        ) : null}
      </div>

      <div className={`filter-panel-shell${open ? " is-open" : ""}`}>
        <button
          type="button"
          className="filter-backdrop"
          aria-label="Закрыть фильтры"
          onClick={() => setOpen(false)}
        />
        <aside
          className="filter-panel filter-panel-sticky"
          role="dialog"
          aria-modal={open}
          aria-label="Фильтры вакансий"
        >
          <div className="filter-panel-inner">
            <button
              type="button"
              className="filter-sheet-grab"
              aria-label="Закрыть фильтры"
              onClick={() => setOpen(false)}
            />
            <div className="filter-panel-header">
              <h2 className="filter-panel-heading">Фильтры</h2>
              <Link className="filter-reset-link" href="/vacancies" scroll={false}>
                <span className="filter-reset-icon" aria-hidden="true">
                  ✕
                </span>
                <span>Сбросить фильтры</span>
              </Link>
            </div>
        <form
          ref={formRef}
          className="filter-form"
          action="/vacancies"
          method="get"
          role="search"
        >
          <div className="filter-groups">
            <div className="filter-group">
              <p className="filter-group-title" id="filter-sphere">
                Сфера
              </p>
              <div className="filter-check-list" role="group" aria-labelledby="filter-sphere">
                {spheres.map((s) => (
                  <label key={s.value} className="filter-check">
                    <input
                      type="checkbox"
                      name="sphere"
                      value={s.value}
                      checked={selected.sphere.includes(s.value)}
                      onChange={() =>
                        pushFilters({
                          ...selected,
                          sphere: toggleInList(selected.sphere, s.value),
                        })
                      }
                    />
                    <span className="filter-check-box" aria-hidden="true" />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <p className="filter-group-title" id="filter-exp">
                Опыт
              </p>
              <div className="filter-check-list" role="group" aria-labelledby="filter-exp">
                {exps.map((s) => (
                  <label key={s.value} className="filter-check">
                    <input
                      type="checkbox"
                      name="exp"
                      value={s.value}
                      checked={selected.exp.includes(s.value)}
                      onChange={() =>
                        pushFilters({
                          ...selected,
                          exp: toggleInList(selected.exp, s.value),
                        })
                      }
                    />
                    <span className="filter-check-box" aria-hidden="true" />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {cities.length ? (
              <div className="filter-group">
                <p className="filter-group-title" id="filter-city">
                  Город
                </p>
                <div className="filter-check-list" role="group" aria-labelledby="filter-city">
                  {cities.map((s) => (
                    <label key={s.value} className="filter-check">
                      <input
                        type="checkbox"
                        name="city"
                        value={s.value}
                        checked={selected.city.includes(s.value)}
                        onChange={() =>
                          pushFilters({
                            ...selected,
                            city: toggleInList(selected.city, s.value),
                          })
                        }
                      />
                      <span className="filter-check-box" aria-hidden="true" />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="filter-group">
              <p className="filter-group-title" id="filter-format">
                Формат
              </p>
              <div className="filter-check-list" role="group" aria-labelledby="filter-format">
                {formats.map((s) => (
                  <label key={s.value} className="filter-check">
                    <input
                      type="checkbox"
                      name="format"
                      value={s.value}
                      checked={selected.format.includes(s.value)}
                      onChange={() =>
                        pushFilters({
                          ...selected,
                          format: toggleInList(selected.format, s.value),
                        })
                      }
                    />
                    <span className="filter-check-box" aria-hidden="true" />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <p className="filter-group-title" id="filter-type">
                Тип
              </p>
              <div className="filter-check-list" role="group" aria-labelledby="filter-type">
                {types.map((s) => (
                  <label key={s.value} className="filter-check">
                    <input
                      type="checkbox"
                      name="type"
                      value={s.value}
                      checked={selected.type.includes(s.value)}
                      onChange={() =>
                        pushFilters({
                          ...selected,
                          type: toggleInList(selected.type, s.value),
                        })
                      }
                    />
                    <span className="filter-check-box" aria-hidden="true" />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="filter-group filter-group--salary">
              <p className="filter-group-title" id="filter-salary">
                Зарплата
              </p>
              <p className="filter-salary-hint">
                Пустые поля — без фильтра по сумме. Уход с поля или Enter —
                применить.
              </p>
              <div
                key={`salary-${selected.salaryFrom}|${selected.salaryTo}`}
                className="filter-salary-row"
              >
                <label className="filter-salary-field">
                  <span className="filter-salary-label">От</span>
                  <input
                    className="filter-salary-input"
                    type="number"
                    name="salary_from"
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    placeholder="—"
                    defaultValue={selected.salaryFrom || ""}
                    aria-labelledby="filter-salary"
                    onBlur={pushSalaryFromForm}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") pushSalaryFromForm();
                    }}
                  />
                  <span className="filter-salary-currency">₽</span>
                </label>
                <label className="filter-salary-field">
                  <span className="filter-salary-label">До</span>
                  <input
                    className="filter-salary-input"
                    type="number"
                    name="salary_to"
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    placeholder="—"
                    defaultValue={selected.salaryTo || ""}
                    aria-labelledby="filter-salary"
                    onBlur={pushSalaryFromForm}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") pushSalaryFromForm();
                    }}
                  />
                  <span className="filter-salary-currency">₽</span>
                </label>
              </div>
            </div>
          </div>
          <div className="filter-bottom-actions">
            <input type="hidden" name="q" value={selected.q} readOnly />
            <button
              type="button"
              className="btn btn-dark filter-submit-btn"
              onClick={pushSalaryFromForm}
            >
              Применить зарплату
            </button>
          </div>
        </form>
            <div className="filter-sheet-footer">
              <Link
                className="filter-sheet-reset"
                href="/vacancies"
                scroll={false}
              >
                Сбросить
              </Link>
              <button
                type="button"
                className="filter-sheet-apply"
                onClick={() => setOpen(false)}
              >
                {resultCount != null
                  ? `Показать ${resultCount}${resultNoun ? ` ${resultNoun}` : ""}`
                  : "Показать вакансии"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
