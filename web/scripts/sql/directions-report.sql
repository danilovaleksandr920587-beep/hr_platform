-- Отчёт «направления» на данных, которые уже собираются (фаза 0 плана из
-- docs/ANALYTICS.md). Запуск:
--   docker exec -i supabase-db psql -U postgres -d postgres < directions-report.sql
--
-- Канон направлений живёт в TypeScript (web/lib/taxonomy/directions.ts) - этот
-- файл повторяет его правила для ad-hoc запуска из psql. Меняя одно, поправь
-- второе.
--
-- Оговорки к цифрам:
--   * vacancy_stats копит просмотры НАКОПИТЕЛЬНЫМ итогом, без времени и без
--     отсечения ботов -> абсолютные значения завышены, сравнивать можно только
--     направления между собой;
--   * QA/DevOps/Безопасность в вакансиях сидят внутри sphere='it', здесь они
--     вытаскиваются по названию и стеку.

\pset border 2

with vac as (
  select
    v.slug,
    case
      when v.sphere <> 'it' then v.sphere
      when lower(coalesce(v.title, '') || ' ' || coalesce(array_to_string(v.skills, ' '), ''))
           ~ '(qa|тестировщик|тестирован|автотест|quality assurance|sdet)' then 'qa'
      when lower(coalesce(v.title, '') || ' ' || coalesce(array_to_string(v.skills, ' '), ''))
           ~ '(devops|девопс|sre|инфраструктур)' then 'devops'
      when lower(coalesce(v.title, '') || ' ' || coalesce(array_to_string(v.skills, ' '), ''))
           ~ '(безопасн|security|пентест|инфобез)' then 'security'
      else 'it'
    end as direction
  from public.vacancies v
  where v.is_published = true
    and coalesce(v.is_archived, false) = false
),
supply as (
  select direction, count(*)::int as vacancies
  from vac
  group by direction
),
traffic as (
  select vac.direction,
         sum(s.views)::int as views,
         sum(s.apply_clicks)::int as apply_clicks
  from public.vacancy_stats s
  join vac on vac.slug = s.vacancy_slug
  group by vac.direction
),
searches as (
  select case
      when lower(q) ~ '(qa|тестировщик|тестирован|автотест|sdet)' then 'qa'
      when lower(q) ~ '(devops|девопс|sre)' then 'devops'
      when lower(q) ~ '(безопасн|пентест|инфобез)' then 'security'
      when lower(q) ~ '(аналитик|analyst|data scientist|дата-сайентист|data engineer|дата-инженер|машинное обучение)' then 'analytics'
      when lower(q) ~ '(дизайн|design|ux|иллюстратор|моушн)' then 'design'
      when lower(q) ~ '(продакт|проджект|product manager|project manager|менеджер проектов)' then 'product'
      when lower(q) ~ '(маркетинг|маркетолог|marketing|smm|seo|таргетолог)' then 'marketing'
      when lower(q) ~ '(hr|рекрутер|recruiter|эйчар|подбор персонала)' then 'hr'
      when lower(q) ~ '(продаж|sales|аккаунт-менеджер)' then 'sales'
      when lower(q) ~ '(поддержк|support|техподдержк)' then 'support'
      when lower(q) ~ '(финанс|бухгалтер|аудит)' then 'finance'
      when lower(q) ~ '(юрист|юридическ|legal|комплаенс)' then 'legal'
      when lower(q) ~ '(разработчик|программист|developer|frontend|backend|фронтенд|бэкенд|фулстек|fullstack|python|java|javascript|golang|c\+\+|android|ios)' then 'it'
      else null
    end as direction,
    count(*)::int as queries,
    count(*) filter (where results_count = 0)::int as zero_result
  from public.search_queries
  group by 1
),
profiles as (
  select case direction
      when 'IT' then 'it'
      when 'QA' then 'qa'
      when 'Аналитика' then 'analytics'
      when 'Дизайн' then 'design'
      when 'Маркетинг' then 'marketing'
      when 'Управление' then 'product'
      when 'Финансы' then 'finance'
      else null
    end as direction,
    count(*)::int as profiles
  from public.user_profiles
  where coalesce(direction, '') <> ''
  group by 1
),
dirs as (
  select direction from supply
  union select direction from traffic
  union select direction from searches where direction is not null
  union select direction from profiles where direction is not null
)
select
  d.direction                                                as "направление",
  coalesce(su.vacancies, 0)                                  as "вакансий",
  round(100.0 * coalesce(su.vacancies, 0)
        / nullif(sum(coalesce(su.vacancies, 0)) over (), 0), 1) as "% предложения",
  coalesce(t.views, 0)                                       as "просмотры",
  round(100.0 * coalesce(t.views, 0)
        / nullif(sum(coalesce(t.views, 0)) over (), 0), 1)   as "% спроса",
  coalesce(t.apply_clicks, 0)                                as "клики",
  round(100.0 * coalesce(t.apply_clicks, 0)
        / nullif(coalesce(t.views, 0), 0), 1)                as "CTR %",
  coalesce(se.queries, 0)                                    as "запросов",
  coalesce(se.zero_result, 0)                                as "из них 0 выдачи",
  coalesce(p.profiles, 0)                                    as "профилей"
from dirs d
left join supply   su on su.direction = d.direction
left join traffic  t  on t.direction  = d.direction
left join searches se on se.direction = d.direction
left join profiles p  on p.direction  = d.direction
order by coalesce(t.views, 0) desc, coalesce(su.vacancies, 0) desc;

-- Хвост: запросы, которые словарь не узнал (кандидаты в правила).
select q, count(*)::int as n, min(results_count) as min_results
from public.search_queries
where lower(q) !~ '(qa|тестировщик|тестирован|автотест|sdet|devops|девопс|sre|безопасн|пентест|инфобез|аналитик|analyst|data scientist|дата-сайентист|data engineer|дата-инженер|машинное обучение|дизайн|design|ux|иллюстратор|моушн|продакт|проджект|product manager|project manager|менеджер проектов|маркетинг|маркетолог|marketing|smm|seo|таргетолог|hr|рекрутер|recruiter|эйчар|подбор персонала|продаж|sales|аккаунт-менеджер|поддержк|support|техподдержк|финанс|бухгалтер|аудит|юрист|юридическ|legal|комплаенс|разработчик|программист|developer|frontend|backend|фронтенд|бэкенд|фулстек|fullstack|python|java|javascript|golang|c\+\+|android|ios)'
group by q
order by n desc, q
limit 25;
