import { requireAnalyticsAdmin } from "@/lib/auth/admin-guard";
import { getUsersReport, parsePeriod } from "@/lib/analytics/reports";
import {
  Bar,
  LineChart,
  PeriodSwitch,
  StatCard,
  formatNumber,
  formatPercent,
} from "@/components/admin/analytics/ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ days?: string }> };

export default async function UsersAnalyticsPage({ searchParams }: Props) {
  await requireAnalyticsAdmin("/admin/analytics/users");
  const { days: rawDays } = await searchParams;
  const days = parsePeriod(rawDays);
  const report = await getUsersReport(days);

  const maxMonth = Math.max(1, ...report.registrationsByMonth.map((m) => m.count));
  const maxDirection = Math.max(1, ...report.byDirection.map((d) => d.count));
  const activeCohorts = report.cohorts.filter((c) => c.size > 0);

  return (
    <>
      <div className="an-head">
        <div>
          <h1 className="an-title">Пользователи</h1>
          <p className="an-sub">
            Регистрации, активация и удержание. Регистрации и активация считаются по
            таблицам БД, поэтому история здесь полная - с апреля 2026.
          </p>
        </div>
        <PeriodSwitch days={days} basePath="/admin/analytics/users" />
      </div>

      <div className="an-cards">
        <StatCard value={report.totalAccounts} label="Аккаунтов всего" />
        {report.activation.slice(1, 4).map((a) => (
          <div className="an-card" key={a.step}>
            <div className="an-card-value">{formatNumber(a.count)}</div>
            <div className="an-card-label">{a.step}</div>
            <div className="an-delta an-delta--flat">{formatPercent(a.share, 0)} от всех</div>
          </div>
        ))}
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Регистрации по месяцам</h2>
        <table className="an-table">
          <thead>
            <tr>
              <th>Месяц</th>
              <th>Регистраций</th>
              <th>Рост</th>
              <th className="an-bar-cell">Доля</th>
            </tr>
          </thead>
          <tbody>
            {report.registrationsByMonth.map((m, i) => {
              const prev = report.registrationsByMonth[i - 1]?.count ?? 0;
              const growth = prev ? ((m.count - prev) / prev) * 100 : null;
              return (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td>{formatNumber(m.count)}</td>
                  <td className={growth !== null && growth > 0 ? "an-gap--over" : ""}>
                    {growth === null ? "-" : `${growth > 0 ? "+" : ""}${growth.toFixed(0)}%`}
                  </td>
                  <td className="an-bar-cell">
                    <Bar share={(100 * m.count) / maxMonth} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Регистрации по неделям</h2>
        <LineChart
          points={report.registrationsByWeek.map((w) => ({ day: w.week, value: w.count }))}
        />
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Активация</h2>
        <p className="an-panel-note">
          Что аккаунты успели сделать за всё время жизни. Главный вопрос: где обрывается
          путь между регистрацией и первым откликом.
        </p>
        <table className="an-table">
          <thead>
            <tr>
              <th>Шаг</th>
              <th>Аккаунтов</th>
              <th>Доля</th>
              <th className="an-bar-cell">Воронка</th>
            </tr>
          </thead>
          <tbody>
            {report.activation.map((a) => (
              <tr key={a.step}>
                <td>{a.step}</td>
                <td>{formatNumber(a.count)}</td>
                <td>{formatPercent(a.share)}</td>
                <td className="an-bar-cell">
                  <Bar share={a.share} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Признаки жизни</h2>
        <p className="an-panel-note">
          Когда аккаунт в последний раз оставил след: профиль, чек-лист, анализ резюме,
          отклик или событие на сайте. Это суррогат удержания на исторических данных -
          настоящие когорты ниже.
        </p>
        <table className="an-table">
          <thead>
            <tr>
              <th>Последняя активность</th>
              <th>Аккаунтов</th>
              <th>Доля</th>
              <th className="an-bar-cell"> </th>
            </tr>
          </thead>
          <tbody>
            {report.lastSeen.map((r) => (
              <tr key={r.bucket}>
                <td>{r.bucket}</td>
                <td>{formatNumber(r.count)}</td>
                <td>{formatPercent(r.share)}</td>
                <td className="an-bar-cell">
                  <Bar share={r.share} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Когорты удержания</h2>
        <p className="an-panel-note">
          Строка - неделя регистрации, столбец - сколько из этой когорты заходили на
          сайт на N-й неделе. Считается по событиям, а они пишутся с 30 августа 2026:
          пока таблица заполнится, пройдёт несколько недель.
        </p>
        {activeCohorts.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Когорта</th>
                <th>Размер</th>
                {Array.from({ length: report.cohortDepth }, (_, i) => (
                  <th key={i}>Неделя {i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeCohorts.map((c) => (
                <tr key={c.cohort}>
                  <td>{c.cohort}</td>
                  <td>{formatNumber(c.size)}</td>
                  {c.weeks.map((w, i) => (
                    <td key={i}>
                      {w === null
                        ? "-"
                        : `${formatNumber(w)} (${formatPercent(c.size ? (100 * w) / c.size : null, 0)})`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="an-empty">Когорт пока нет.</p>
        )}
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Кто регистрируется</h2>
        <p className="an-panel-note">
          По анкете в кабинете. Сравните с вкладкой «Направления»: если аудитория
          дизайнеров растёт, а вакансий по дизайну нет, это дыра в продукте.
        </p>
        <table className="an-table">
          <thead>
            <tr>
              <th>Направление</th>
              <th>Анкет</th>
              <th className="an-bar-cell">Доля</th>
            </tr>
          </thead>
          <tbody>
            {report.byDirection.map((d) => (
              <tr key={d.direction}>
                <td>{d.label}</td>
                <td>{formatNumber(d.count)}</td>
                <td className="an-bar-cell">
                  <Bar share={(100 * d.count) / maxDirection} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Уровень в анкете</h2>
        <table className="an-table">
          <thead>
            <tr>
              <th>Уровень</th>
              <th>Анкет</th>
            </tr>
          </thead>
          <tbody>
            {report.byLevel.map((l) => (
              <tr key={l.level}>
                <td>{l.level}</td>
                <td>{formatNumber(l.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
