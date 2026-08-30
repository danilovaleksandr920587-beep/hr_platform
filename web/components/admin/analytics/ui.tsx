import Link from "next/link";
import type { Period } from "@/lib/analytics/reports";
import { PERIODS } from "@/lib/analytics/reports";

export function StatCard({
  value,
  label,
  previous,
  suffix,
}: {
  value: number;
  label: string;
  previous?: number;
  suffix?: string;
}) {
  return (
    <div className="an-card">
      <div className="an-card-value">
        {formatNumber(value)}
        {suffix ?? ""}
      </div>
      <div className="an-card-label">{label}</div>
      {previous === undefined ? null : <Delta current={value} previous={previous} />}
    </div>
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous) {
    return <div className="an-delta an-delta--flat">не с чем сравнить</div>;
  }
  const diff = ((current - previous) / previous) * 100;
  const cls = diff > 1 ? "up" : diff < -1 ? "down" : "flat";
  const sign = diff > 0 ? "+" : "";
  return (
    <div className={`an-delta an-delta--${cls}`}>
      {sign}
      {diff.toFixed(0)}% к прошлому периоду
    </div>
  );
}

export function PeriodSwitch({ days, basePath }: { days: Period; basePath: string }) {
  return (
    <div className="an-period">
      <span>Период:</span>
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={`${basePath}?days=${p}`}
          className={p === days ? "is-active" : ""}
        >
          {p} дн.
        </Link>
      ))}
    </div>
  );
}

/** Полоска доли внутри таблицы: без неё колонки процентов не читаются глазом. */
export function Bar({ share }: { share: number }) {
  const width = Math.max(0, Math.min(100, share));
  return <span className="an-bar" style={{ width: `${width}%` }} aria-hidden />;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

export function formatPercent(n: number | null, digits = 1): string {
  return n === null || Number.isNaN(n) ? "-" : `${n.toFixed(digits)}%`;
}

/**
 * График визитов: инлайновый SVG вместо chart.js.
 * Дашборд смотрит один человек, а лишний клиентский бандл ради одной линии
 * того не стоит.
 */
export function LineChart({ points }: { points: { day: string; value: number }[] }) {
  if (points.length < 2) {
    return <p className="an-empty">Данных пока мало для графика.</p>;
  }
  const width = 1000;
  const height = 160;
  const pad = 8;
  const max = Math.max(...points.map((p) => p.value), 1);
  const step = (width - pad * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = height - pad - ((height - pad * 2) * p.value) / max;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <>
      <svg
        className="an-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Визиты по дням"
      >
        <polyline
          points={`${pad},${height - pad} ${coords.join(" ")} ${width - pad},${height - pad}`}
          fill="#d7f00033"
          stroke="none"
        />
        <polyline points={coords.join(" ")} fill="none" stroke="#7a8c00" strokeWidth="2" />
      </svg>
      <div className="an-legend">
        {points[0].day} - {points[points.length - 1].day}, максимум {formatNumber(max)} за день
      </div>
    </>
  );
}

/** Таблица одного разреза вакансий: строки уже отсортированы репортом. */
export function SliceTable({
  title,
  note,
  rows,
  firstColumn = "Значение",
}: {
  title: string;
  note?: string;
  rows: import("@/lib/analytics/reports").SliceRow[];
  firstColumn?: string;
}) {
  const maxViews = Math.max(1, ...rows.map((r) => r.views));
  return (
    <div className="an-panel">
      <h2 className="an-panel-title">{title}</h2>
      {note ? <p className="an-panel-note">{note}</p> : null}
      {rows.length ? (
        <table className="an-table">
          <thead>
            <tr>
              <th>{firstColumn}</th>
              <th>Вакансий</th>
              <th>Просмотров</th>
              <th>На вакансию</th>
              <th>Кликов</th>
              <th>CTR</th>
              <th className="an-bar-cell">Доля просмотров</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td>{formatNumber(r.vacancies)}</td>
                <td>{formatNumber(r.views)}</td>
                <td>{r.viewsPerVacancy === null ? "-" : r.viewsPerVacancy.toFixed(1)}</td>
                <td>{formatNumber(r.apply)}</td>
                <td>{formatPercent(r.ctr)}</td>
                <td className="an-bar-cell">
                  <Bar share={(100 * r.views) / maxViews} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="an-empty">Нет данных.</p>
      )}
    </div>
  );
}
