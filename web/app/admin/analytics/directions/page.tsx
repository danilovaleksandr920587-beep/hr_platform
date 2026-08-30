import { requireAnalyticsAdmin } from "@/lib/auth/admin-guard";
import { getDirectionsReport, parsePeriod } from "@/lib/analytics/reports";
import { DIRECTION_LABELS } from "@/lib/taxonomy/directions";
import {
  Bar,
  PeriodSwitch,
  formatNumber,
  formatPercent,
} from "@/components/admin/analytics/ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ days?: string }> };

export default async function DirectionsPage({ searchParams }: Props) {
  await requireAnalyticsAdmin("/admin/analytics/directions");
  const { days: rawDays } = await searchParams;
  const days = parsePeriod(rawDays);
  const report = await getDirectionsReport(days);

  return (
    <>
      <div className="an-head">
        <div>
          <h1 className="an-title">Направления</h1>
          <p className="an-sub">
            Спрос против предложения: где аудитория есть, а вакансий нет.
            {report.hasEvents
              ? " Просмотры и клики - за выбранный период."
              : " Событий пока мало, поэтому просмотры и клики показаны из накопительных счётчиков vacancy_stats - это «за всё время» и без отсечения ботов."}
          </p>
        </div>
        <PeriodSwitch days={days} basePath="/admin/analytics/directions" />
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Спрос и предложение</h2>
        <p className="an-panel-note">
          Разрыв = доля спроса минус доля предложения. Красное - направление, где
          интерес аудитории не закрыт вакансиями.
        </p>
        <table className="an-table">
          <thead>
            <tr>
              <th>Направление</th>
              <th>Вакансий</th>
              <th>% предложения</th>
              <th>Просмотров</th>
              <th>% спроса</th>
              <th>Разрыв</th>
              <th className="an-bar-cell">Спрос</th>
              <th>Кликов</th>
              <th>CTR</th>
              <th>Сохранений</th>
              <th>Запросов</th>
              <th>Из них 0 выдачи</th>
              <th>Профилей</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => {
              const gap = row.demandShare - row.supplyShare;
              return (
                <tr key={row.direction}>
                  <td>{DIRECTION_LABELS[row.direction]}</td>
                  <td>{formatNumber(row.vacancies)}</td>
                  <td>{formatPercent(row.supplyShare)}</td>
                  <td>{formatNumber(row.views)}</td>
                  <td>{formatPercent(row.demandShare)}</td>
                  <td className={gap > 2 ? "an-gap--under" : gap < -2 ? "an-gap--over" : ""}>
                    {gap > 0 ? "+" : ""}
                    {gap.toFixed(1)} п.п.
                  </td>
                  <td className="an-bar-cell">
                    <Bar share={row.demandShare} />
                  </td>
                  <td>{formatNumber(row.applyClicks)}</td>
                  <td>{formatPercent(row.ctr)}</td>
                  <td>{formatNumber(row.saves)}</td>
                  <td>{formatNumber(row.queries)}</td>
                  <td>{formatNumber(row.zeroResultQueries)}</td>
                  <td>{formatNumber(row.profiles)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Запросы без направления</h2>
        <p className="an-panel-note">
          Словарь в lib/taxonomy/directions.ts их не узнал. Частые строки отсюда -
          кандидаты в правила, а нулевая выдача рядом - ещё и дыра в поиске.
        </p>
        {report.unclassifiedQueries.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Запрос</th>
                <th>Раз</th>
                <th>Минимум результатов</th>
              </tr>
            </thead>
            <tbody>
              {report.unclassifiedQueries.map((q) => (
                <tr key={q.q}>
                  <td>{q.q}</td>
                  <td>{formatNumber(q.n)}</td>
                  <td className={q.minResults === 0 ? "an-gap--under" : ""}>{q.minResults}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="an-empty">Все запросы за период узнаны.</p>
        )}
      </div>
    </>
  );
}
