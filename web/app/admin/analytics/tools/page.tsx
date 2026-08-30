import { requireAnalyticsAdmin } from "@/lib/auth/admin-guard";
import { getToolsReport, parsePeriod } from "@/lib/analytics/reports";
import {
  Bar,
  PeriodSwitch,
  StatCard,
  formatNumber,
  formatPercent,
} from "@/components/admin/analytics/ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ days?: string }> };

export default async function ToolsAnalyticsPage({ searchParams }: Props) {
  await requireAnalyticsAdmin("/admin/analytics/tools");
  const { days: rawDays } = await searchParams;
  const days = parsePeriod(rawDays);
  const report = await getToolsReport(days);
  const maxFilterValue = Math.max(1, ...report.search.topFilterValues.map((f) => f.n));

  return (
    <>
      <div className="an-head">
        <div>
          <h1 className="an-title">Инструменты и поиск</h1>
          <p className="an-sub">
            Анализатор резюме и калькулятор считаются по событиям (пишутся с 30 августа
            2026), поиск - по таблице search_queries, у неё история с августа.
          </p>
        </div>
        <PeriodSwitch days={days} basePath="/admin/analytics/tools" />
      </div>

      <div className="an-cards">
        <StatCard value={report.resume.starts} label="Запусков анализа резюме" />
        <StatCard value={report.resume.finishes} label="Завершённых анализов" />
        <div className="an-card">
          <div className="an-card-value">{formatPercent(report.resume.completion, 0)}</div>
          <div className="an-card-label">Доводят до результата</div>
        </div>
        <div className="an-card">
          <div className="an-card-value">
            {report.resume.avgScore === null ? "-" : report.resume.avgScore.toFixed(0)}
          </div>
          <div className="an-card-label">Средний балл резюме</div>
        </div>
        <StatCard value={report.calculator.uses} label="Расчётов зарплаты" />
        <StatCard value={report.search.total} label="Поисковых запросов" />
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Качество резюме аудитории</h2>
        <p className="an-panel-note">
          Распределение баллов. Если большинство ниже 45 - это тема для статей и повод
          показывать анализатор раньше в пути пользователя.
        </p>
        <table className="an-table">
          <thead>
            <tr>
              <th>Диапазон</th>
              <th>Анализов</th>
            </tr>
          </thead>
          <tbody>
            {report.resume.scoreBuckets.map((b) => (
              <tr key={b.bucket}>
                <td>{b.bucket}</td>
                <td>{formatNumber(b.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="an-panel-note" style={{ marginTop: 12, marginBottom: 0 }}>
          В таблицу user_resume_analyses за период попало {formatNumber(report.resume.savedToDb)}{" "}
          записей, всего за историю - {formatNumber(report.resume.savedToDbAllTime)}. Если эта
          цифра сильно меньше числа завершённых анализов, история кабинета не сохраняется
          в базу (сейчас клиент пишет её только в localStorage).
        </p>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Калькулятор зарплат: что считают</h2>
        <p className="an-panel-note">
          Прямой индикатор спроса: человек сам называет направление, уровень и город.
        </p>
        <table className="an-table">
          <thead>
            <tr>
              <th>Направление</th>
              <th>Расчётов</th>
            </tr>
          </thead>
          <tbody>
            {report.calculator.byDirection.length ? (
              report.calculator.byDirection.map((d) => (
                <tr key={d.label}>
                  <td>{d.label}</td>
                  <td>{formatNumber(d.count)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td>Данных пока нет</td>
                <td>-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Поиск: качество выдачи</h2>
        <table className="an-table">
          <thead>
            <tr>
              <th>Показатель</th>
              <th>Значение</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Запросов за период</td>
              <td>{formatNumber(report.search.total)}</td>
            </tr>
            <tr>
              <td>Из них с пустой выдачей</td>
              <td className={(report.search.zeroShare ?? 0) > 15 ? "an-gap--under" : ""}>
                {formatNumber(report.search.zeroResult)} ({formatPercent(report.search.zeroShare)})
              </td>
            </tr>
            <tr>
              <td>Спасено нечётким поиском</td>
              <td>{formatNumber(report.search.fuzzyUsed)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Запросы без результатов</h2>
        <p className="an-panel-note">
          Самый прикладной отчёт: каждая строка - либо дыра в словаре синонимов
          (lib/search/query.ts), либо вакансия, которой у нас нет.
        </p>
        {report.search.zeroQueries.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Запрос</th>
                <th>Раз</th>
              </tr>
            </thead>
            <tbody>
              {report.search.zeroQueries.map((q) => (
                <tr key={q.q}>
                  <td>{q.q}</td>
                  <td>{formatNumber(q.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="an-empty">Пустых выдач за период не было.</p>
        )}
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Популярные запросы</h2>
        <table className="an-table">
          <thead>
            <tr>
              <th>Запрос</th>
              <th>Раз</th>
              <th>Минимум результатов</th>
            </tr>
          </thead>
          <tbody>
            {report.search.topQueries.map((q) => (
              <tr key={q.q}>
                <td>{q.q}</td>
                <td>{formatNumber(q.n)}</td>
                <td className={q.minResults === 0 ? "an-gap--under" : ""}>{q.minResults}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Какими фильтрами пользуются</h2>
        <p className="an-panel-note">
          Доля запросов, где фильтр был задан. Неиспользуемый фильтр - кандидат на
          удаление из интерфейса, перегруженный - на вынос наверх.
        </p>
        <table className="an-table">
          <thead>
            <tr>
              <th>Фильтр</th>
              <th>Запросов с ним</th>
              <th>Доля</th>
              <th className="an-bar-cell"> </th>
            </tr>
          </thead>
          <tbody>
            {report.search.filterUsage.map((f) => (
              <tr key={f.filter}>
                <td>{f.filter}</td>
                <td>{formatNumber(f.used)}</td>
                <td>{formatPercent(f.share)}</td>
                <td className="an-bar-cell">
                  <Bar share={f.share} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Что выбирают в фильтрах</h2>
        {report.search.topFilterValues.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Фильтр</th>
                <th>Значение</th>
                <th>Раз</th>
                <th className="an-bar-cell"> </th>
              </tr>
            </thead>
            <tbody>
              {report.search.topFilterValues.map((f) => (
                <tr key={`${f.filter}-${f.value}`}>
                  <td>{f.filter}</td>
                  <td>{f.value}</td>
                  <td>{formatNumber(f.n)}</td>
                  <td className="an-bar-cell">
                    <Bar share={(100 * f.n) / maxFilterValue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="an-empty">Фильтрами за период не пользовались.</p>
        )}
      </div>
    </>
  );
}
