import { requireAnalyticsAdmin } from "@/lib/auth/admin-guard";
import { getContentReport, parsePeriod } from "@/lib/analytics/reports";
import {
  Bar,
  PeriodSwitch,
  StatCard,
  formatNumber,
  formatPercent,
} from "@/components/admin/analytics/ui";

export const dynamic = "force-dynamic";

const CLUSTER_LABELS: Record<string, string> = {
  resume: "Резюме",
  interview: "Собеседование",
  test: "Тестовые",
  salary: "Зарплата",
  apply: "Отклики",
  career: "Карьера и рост",
  unknown: "Без кластера",
};

type Props = { searchParams: Promise<{ days?: string }> };

export default async function ContentPage({ searchParams }: Props) {
  await requireAnalyticsAdmin("/admin/analytics/content");
  const { days: rawDays } = await searchParams;
  const days = parsePeriod(rawDays);
  const report = await getContentReport(days);
  const maxCluster = Math.max(1, ...report.clusters.map((c) => c.views));

  return (
    <>
      <div className="an-head">
        <div>
          <h1 className="an-title">Контент</h1>
          <p className="an-sub">
            База знаний - главный вход трафика. Здесь видно, какие кластеры читают
            до конца и приводят ли они к вакансиям.
          </p>
        </div>
        <PeriodSwitch days={days} basePath="/admin/analytics/content" />
      </div>

      {report.hasEvents ? null : (
        <div className="an-panel">
          <p className="an-empty">
            Событий по статьям за период нет - данные появятся после накопления.
          </p>
        </div>
      )}

      <div className="an-cards">
        <StatCard value={report.articleToVacancy.articleSessions} label="Визитов со статьями" />
        <StatCard value={report.articleToVacancy.alsoVacancy} label="Из них дошли до вакансий" />
        <div className="an-card">
          <div className="an-card-value">{formatPercent(report.articleToVacancy.rate)}</div>
          <div className="an-card-label">Переход «статья → вакансия»</div>
        </div>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Кластеры</h2>
        <p className="an-panel-note">
          Дочитывание = 75 % прокрутки и не меньше 30 секунд на странице.
        </p>
        {report.clusters.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Кластер</th>
                <th>Просмотров</th>
                <th>Дочитываний</th>
                <th>Доля дочитываний</th>
                <th className="an-bar-cell">Просмотры</th>
              </tr>
            </thead>
            <tbody>
              {report.clusters.map((c) => (
                <tr key={c.cluster}>
                  <td>{CLUSTER_LABELS[c.cluster] ?? c.cluster}</td>
                  <td>{formatNumber(c.views)}</td>
                  <td>{formatNumber(c.reads)}</td>
                  <td>{formatPercent(c.readRate)}</td>
                  <td className="an-bar-cell">
                    <Bar share={(100 * c.views) / maxCluster} />
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
        <h2 className="an-panel-title">Топ статей</h2>
        {report.topArticles.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Статья</th>
                <th>Просмотров</th>
                <th>Дочитываний</th>
                <th>Доля</th>
              </tr>
            </thead>
            <tbody>
              {report.topArticles.map((a) => (
                <tr key={a.slug}>
                  <td>
                    <a
                      className="text-link"
                      href={`/knowledge-base/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {a.title}
                    </a>
                  </td>
                  <td>{formatNumber(a.views)}</td>
                  <td>{formatNumber(a.reads)}</td>
                  <td>{formatPercent(a.views ? (100 * a.reads) / a.views : null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="an-empty">Нет данных за период.</p>
        )}
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Читают хуже всего</h2>
        <p className="an-panel-note">
          Статьи с 10+ просмотрами и низкой долей дочитываний: трафик есть, текст не держит.
        </p>
        {report.weakArticles.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Статья</th>
                <th>Просмотров</th>
                <th>Дочитываний</th>
                <th>Доля</th>
              </tr>
            </thead>
            <tbody>
              {report.weakArticles.map((a) => (
                <tr key={a.slug}>
                  <td>
                    <a
                      className="text-link"
                      href={`/knowledge-base/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {a.title}
                    </a>
                  </td>
                  <td>{formatNumber(a.views)}</td>
                  <td>{formatNumber(a.reads)}</td>
                  <td>{formatPercent(a.views ? (100 * a.reads) / a.views : null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="an-empty">Пока недостаточно данных.</p>
        )}
      </div>
    </>
  );
}
