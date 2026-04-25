"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
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

type Props = {
  selected: {
    sphere: string[];
    city: string[];
    exp: string[];
    format: string[];
    type: string[];
    salaryFrom: string;
    salaryTo: string;
    q: string;
  };
  options?: {
    sphere?: FilterOption[];
    city?: FilterOption[];
    exp?: FilterOption[];
    format?: FilterOption[];
    type?: FilterOption[];
  };
};

export function VacancyFilterForm({ selected, options }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const spheres = options?.sphere?.length ? options.sphere : DEFAULT_SPHERES;
  const cities = options?.city?.length ? options.city : [];
  const exps = options?.exp?.length ? options.exp : DEFAULT_EXPS;
  const formats = options?.format?.length ? options.format : DEFAULT_FORMATS;
  const types = options?.type?.length ? options.type : DEFAULT_TYPES;

  const pushFromForm = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, val] of fd.entries()) {
      if (val === "") continue;
      params.append(key, String(val));
    }
    const qs = params.toString();
    router.push(qs ? `/vacancies?${qs}` : "/vacancies", { scroll: false });
  }, [router]);

  return (
    <aside className="filter-panel filter-panel-sticky">
      <div className="filter-panel-inner">
        <div className="filter-panel-header">
          <h2 className="filter-panel-heading">Фильтры</h2>
          <Link className="filter-reset-link" href="/vacancies">
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
          onChange={(e) => {
            const t = e.target;
            if (t instanceof HTMLInputElement && t.type === "checkbox") {
              pushFromForm();
            }
          }}
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
                      defaultChecked={selected.sphere.includes(s.value)}
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
                      defaultChecked={selected.exp.includes(s.value)}
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
                        defaultChecked={selected.city.includes(s.value)}
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
                      defaultChecked={selected.format.includes(s.value)}
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
                      defaultChecked={selected.type.includes(s.value)}
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
              <div className="filter-salary-row">
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
                    defaultValue={selected.salaryFrom}
                    aria-labelledby="filter-salary"
                    onBlur={pushFromForm}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") pushFromForm();
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
                    defaultValue={selected.salaryTo}
                    aria-labelledby="filter-salary"
                    onBlur={pushFromForm}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") pushFromForm();
                    }}
                  />
                  <span className="filter-salary-currency">₽</span>
                </label>
              </div>
            </div>
          </div>
          <div className="filter-bottom-actions">
            <input type="hidden" name="q" value={selected.q} />
            <button
              type="button"
              className="btn btn-dark filter-submit-btn"
              onClick={pushFromForm}
            >
              Применить зарплату
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
