const spheres = [
  { value: "it", label: "IT" },
  { value: "design", label: "Дизайн" },
  { value: "marketing", label: "Маркетинг" },
  { value: "analytics", label: "Аналитика" },
];
const exps = [
  { value: "none", label: "Без опыта" },
  { value: "lt1", label: "До 1 года" },
  { value: "1-3", label: "1–3 года" },
  { value: "gte3", label: "От 3 лет" },
];
const formats = [
  { value: "remote", label: "Удалёнка" },
  { value: "hybrid", label: "Гибрид" },
  { value: "office", label: "Офис" },
];
import Link from "next/link";

const types = [
  { value: "internship", label: "Стажировка" },
  { value: "project", label: "Проектная работа" },
  { value: "parttime", label: "Подработка" },
];

type Props = {
  selected: {
    sphere: string[];
    exp: string[];
    format: string[];
    type: string[];
    salaryFrom: string;
    salaryTo: string;
    q: string;
  };
};

export function VacancyFilterForm({ selected }: Props) {
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
        <form className="filter-form" action="/vacancies" method="get">
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
                Пустые поля — без фильтра по сумме.
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
                  />
                  <span className="filter-salary-currency">₽</span>
                </label>
              </div>
            </div>
          </div>
          <div className="filter-bottom-actions">
            <input type="hidden" name="q" value={selected.q} />
            <button type="submit" className="btn btn-dark filter-submit-btn">
              Искать
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
