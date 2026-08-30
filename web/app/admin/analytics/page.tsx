import { requireAnalyticsAdmin } from "@/lib/auth/admin-guard";
import { getOverview, parsePeriod } from "@/lib/analytics/reports";
import {
  Bar,
  LineChart,
  PeriodSwitch,
  StatCard,
  formatNumber,
  formatPercent,
} from "@/components/admin/analytics/ui";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  organic: "Поиск",
  telegram: "Telegram",
  direct: "Прямые заходы",
  referral: "Переходы с сайтов",
  social: "Соцсети",
  paid: "Реклама",
  email: "Почта",
  internal: "Внутренние переходы",
  unknown: "Не определён",
};

type Props = { searchParams: Promise<{ days?: string }> };

export default async function AnalyticsOverviewPage({ searchParams }: Props) {
  await requireAnalyticsAdmin("/admin/analytics");
  const { days: rawDays } = await searchParams;
  const days = parsePeriod(rawDays);
  const report = await getOverview(days);
  const { totals, previous } = report;

  const maxChannel = Math.max(1, ...report.channels.map((c) => c.visits));
  const maxPageType = Math.max(1, ...report.pageTypes.map((p) => p.views));

  return (
    <>
      <div className="an-head">
        <div>
          <h1 className="an-title">Обзор</h1>
          <p className="an-sub">
            Внутренние события платформы. Трафик целиком - в Яндекс.Метрике: цифры там
            и здесь никогда не сойдутся (боты, блокировщики, разные определения визита).
          </p>
        </div>
        <PeriodSwitch days={days} basePath="/admin/analytics" />
      </div>

      {report.hasEvents ? null : (
        <div className="an-panel">
          <p className="an-empty">
            Событий за период нет. Так и должно быть в первые часы после выкладки -
            дальше данные начнут накапливаться.
          </p>
        </div>
      )}

      <div className="an-cards">
        <StatCard value={totals.visitors} label="Посетителей" previous={previous.visitors} />
        <StatCard value={totals.visits} label="Визитов" previous={previous.visits} />
        <StatCard value={totals.pageViews} label="Просмотров страниц" />
        <StatCard value={totals.vacancyViewers} label="Смотрели вакансии" />
        <StatCard
          value={totals.registrations}
          label="Регистраций"
          previous={previous.registrations}
        />
        <StatCard value={totals.applyClicks} label="Кликов «Откликнуться»" />
        <StatCard value={totals.applications} label="Откликов на платформе" />
        <StatCard value={totals.leads} label="Лидов от компаний" />
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Визиты по дням</h2>
        <LineChart points={report.daily.map((d) => ({ day: d.day, value: d.visits }))} />
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Воронка</h2>
        <p className="an-panel-note">
          Регистрации и отклики считаются по таблицам БД, остальное - по событиям.
        </p>
        <table className="an-table">
          <thead>
            <tr>
              <th>Шаг</th>
              <th>Значение</th>
              <th>От посетителей</th>
            </tr>
          </thead>
          <tbody>
            {[
              { step: "Посетители", value: totals.visitors },
              { step: "Смотрели вакансии", value: totals.vacancyViewers },
              { step: "Кликнули «Откликнуться»", value: totals.applyClicks },
              { step: "Зарегистрировались", value: totals.registrations },
              { step: "Отправили отклик на платформе", value: totals.applications },
            ].map((row) => (
              <tr key={row.step}>
                <td>{row.step}</td>
                <td>{formatNumber(row.value)}</td>
                <td>
                  {formatPercent(totals.visitors ? (100 * row.value) / totals.visitors : null)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Каналы</h2>
        {report.channels.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Канал</th>
                <th>Визитов</th>
                <th className="an-bar-cell">Доля</th>
              </tr>
            </thead>
            <tbody>
              {report.channels.map((c) => (
                <tr key={c.channel}>
                  <td>{CHANNEL_LABELS[c.channel] ?? c.channel}</td>
                  <td>{formatNumber(c.visits)}</td>
                  <td className="an-bar-cell">
                    <Bar share={(100 * c.visits) / maxChannel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="an-empty">Нет данных за период.</p>
        )}
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Типы страниц</h2>
        {report.pageTypes.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Тип</th>
                <th>Просмотров</th>
                <th className="an-bar-cell">Доля</th>
              </tr>
            </thead>
            <tbody>
              {report.pageTypes.map((p) => (
                <tr key={p.pageType}>
                  <td>{p.pageType}</td>
                  <td>{formatNumber(p.views)}</td>
                  <td className="an-bar-cell">
                    <Bar share={(100 * p.views) / maxPageType} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="an-empty">Нет данных за период.</p>
        )}
      </div>
    </>
  );
}
