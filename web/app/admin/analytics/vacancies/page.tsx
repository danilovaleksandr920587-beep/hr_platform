import { requireAnalyticsAdmin } from "@/lib/auth/admin-guard";
import { getVacanciesReport, parsePeriod } from "@/lib/analytics/reports";
import {
  PeriodSwitch,
  SliceTable,
  formatNumber,
  formatPercent,
} from "@/components/admin/analytics/ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ days?: string }> };

export default async function VacanciesAnalyticsPage({ searchParams }: Props) {
  await requireAnalyticsAdmin("/admin/analytics/vacancies");
  const { days: rawDays } = await searchParams;
  const days = parsePeriod(rawDays);
  const report = await getVacanciesReport(days);

  return (
    <>
      <div className="an-head">
        <div>
          <h1 className="an-title">Вакансии</h1>
          <p className="an-sub">
            Какие вакансии смотрят и по каким кликают «Откликнуться».
            {report.hasEvents
              ? " Данные за выбранный период."
              : " Событий за период ещё нет, поэтому показаны накопительные счётчики vacancy_stats: это «за всё время» и без отсечения ботов."}{" "}
            «На вакансию» - просмотров в среднем на одну вакансию в срезе: показывает
            интерес честнее, чем сумма, когда вакансий в срезе мало.
          </p>
        </div>
        <PeriodSwitch days={days} basePath="/admin/analytics/vacancies" />
      </div>

      <SliceTable
        title="Тип занятости"
        note="Ради чего аудитория приходит: стажировка, проект или подработка."
        rows={report.byEmploymentType}
        firstColumn="Тип"
      />
      <SliceTable title="Требуемый опыт" rows={report.byExp} firstColumn="Опыт" />
      <SliceTable title="Формат работы" rows={report.byFormat} firstColumn="Формат" />
      <SliceTable
        title="Зарплата в вакансии"
        note="Указанная вилка против скрытой - прямой аргумент в разговоре с работодателем."
        rows={report.bySalary}
        firstColumn="Вилка"
      />
      <SliceTable title="Города" rows={report.byCity} firstColumn="Город" />
      <SliceTable
        title="Возраст вакансии"
        note="Если старые вакансии собирают заметную долю просмотров, парсер отстаёт от спроса."
        rows={report.byAge}
        firstColumn="Возраст"
      />
      <SliceTable
        title="Источник"
        note="Парсер против вакансий, заведённых компаниями в кабинете."
        rows={report.bySource}
        firstColumn="Источник"
      />
      <SliceTable
        title="Компании"
        note="Топ-15 по просмотрам. Это же - материал для КП: сколько показов получила компания."
        rows={report.byCompany}
        firstColumn="Компания"
      />

      <div className="an-panel">
        <h2 className="an-panel-title">Топ вакансий</h2>
        <table className="an-table">
          <thead>
            <tr>
              <th>Вакансия</th>
              <th>Компания</th>
              <th>Просмотров</th>
              <th>Кликов</th>
              <th>CTR</th>
            </tr>
          </thead>
          <tbody>
            {report.top.map((v) => (
              <tr key={v.slug}>
                <td>
                  <a
                    className="text-link"
                    href={`/vacancies/${v.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {v.title}
                  </a>
                </td>
                <td>{v.company}</td>
                <td>{formatNumber(v.views)}</td>
                <td>{formatNumber(v.apply)}</td>
                <td>{formatPercent(v.ctr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Смотрят, но не откликаются</h2>
        <p className="an-panel-note">
          Просмотров не меньше медианы, а CTR низкий: чаще всего проблема в описании,
          зарплате или в том, что отклик уводит на внешний сайт.
        </p>
        {report.worstCtr.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Вакансия</th>
                <th>Компания</th>
                <th>Просмотров</th>
                <th>Кликов</th>
                <th>CTR</th>
              </tr>
            </thead>
            <tbody>
              {report.worstCtr.map((v) => (
                <tr key={v.slug}>
                  <td>
                    <a
                      className="text-link"
                      href={`/vacancies/${v.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {v.title}
                    </a>
                  </td>
                  <td>{v.company}</td>
                  <td>{formatNumber(v.views)}</td>
                  <td>{formatNumber(v.apply)}</td>
                  <td>{formatPercent(v.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="an-empty">Пока недостаточно данных.</p>
        )}
      </div>

      <div className="an-panel">
        <h2 className="an-panel-title">Мёртвый груз</h2>
        <p className="an-panel-note">
          Опубликованы, но не получили ни одного просмотра. Самые старые - сверху.
        </p>
        {report.deadStock.length ? (
          <table className="an-table">
            <thead>
              <tr>
                <th>Вакансия</th>
                <th>Компания</th>
                <th>Дней с публикации</th>
              </tr>
            </thead>
            <tbody>
              {report.deadStock.map((v) => (
                <tr key={v.slug}>
                  <td>
                    <a
                      className="text-link"
                      href={`/vacancies/${v.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {v.title}
                    </a>
                  </td>
                  <td>{v.company}</td>
                  <td>{v.ageDays < 0 ? "-" : formatNumber(v.ageDays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="an-empty">Все вакансии кто-то открывал.</p>
        )}
      </div>
    </>
  );
}
