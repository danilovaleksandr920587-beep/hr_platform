-- Поиск по вакансиям, фаза 2: алиасы запроса, фасеты по текущей выдаче,
-- пагинация, фолбэк на опечатки. Продолжение 20260809000000_vacancy_search.sql.
--
-- Владелец public.vacancies = supabase_admin, применять суперпользователем:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
--     < web/supabase/migrations/20260809120000_vacancy_search_phase2.sql
--
-- Таблица лога запросов - в парной миграции 20260809120100_search_queries.sql,
-- её применяет роль приложения (DATABASE_URL), как остальные пользовательские
-- таблицы.

begin;

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. combine_tsqueries(): OR из нескольких формулировок одного запроса
-- ---------------------------------------------------------------------------
-- Нужна для словаря алиасов: «фронтенд разработчик» ищется и как
-- «frontend разработчик». Склеить их в текст нельзя - websearch_to_tsquery
-- понимает `or`, но не понимает скобки, и приоритет операторов ломается.
-- Поэтому каждый вариант превращаем в tsquery отдельно и объединяем через ||.
-- Варианты из одних стоп-слов (numnode = 0) отбрасываем: иначе пустой tsquery
-- обнулит всю выдачу.
create or replace function public.combine_tsqueries(variants text[])
returns tsquery
language plpgsql
immutable
parallel safe
set search_path = public
as $$
declare
  acc tsquery := null;
  one tsquery;
  v   text;
begin
  foreach v in array coalesce(variants, '{}'::text[]) loop
    if btrim(coalesce(v, '')) = '' then
      continue;
    end if;
    one := websearch_to_tsquery('russian', v);
    if one is null or numnode(one) = 0 then
      continue;
    end if;
    acc := case when acc is null then one else acc || one end;
  end loop;
  return acc;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. search_vacancies(): + алиасы, пагинация, тотал-счётчики, фильтр по tier
-- ---------------------------------------------------------------------------
-- Сигнатура меняется, поэтому старую версию сносим явно: у функций с
-- параметрами по умолчанию create or replace не заменит функцию с другим
-- списком типов, а оставит рядом вторую и сделает вызов неоднозначным.
drop function if exists public.search_vacancies(
  text, text[], text[], text[], text[], text[], int, int, boolean, int
);

create or replace function public.search_vacancies(
  q                text    default null,
  q_alts           text[]  default null,
  spheres          text[]  default null,
  cities           text[]  default null,
  exps             text[]  default null,
  formats          text[]  default null,
  types            text[]  default null,
  salary_from      int     default null,
  salary_to        int     default null,
  include_archived boolean default false,
  only_tier        int     default null,
  page             int     default 1,
  per_page         int     default 20
)
returns table (
  id                  uuid,
  slug                text,
  title               text,
  company             text,
  description         text,
  description_blocks  jsonb,
  sphere              text,
  exp                 text,
  format              text,
  employment_type     text,
  salary_min          int,
  salary_max          int,
  apply_url           text,
  published_at        timestamptz,
  is_featured         boolean,
  featured_until      timestamptz,
  source              text,
  company_id          uuid,
  company_about       text,
  company_logo_url    text,
  city                text,
  skills              text[],
  source_published_at timestamptz,
  is_archived         boolean,
  match_tier          int,
  match_score         real,
  total_primary       bigint,
  total_mentions      bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with p as (
    select
      nullif(btrim(coalesce(q, '')), '') as raw,
      public.combine_tsqueries(
        array_prepend(coalesce(q, ''), coalesce(q_alts, '{}'::text[]))
      ) as tsq
  ),
  matched as (
    select
      v.*,
      case
        when p.tsq is null then 0
        -- веса {D,C,B,A}: C обнулён, значит ранг > 0 только при попадании
        -- в название / компанию / город / стек
        when ts_rank_cd('{0,0,1,1}', v.search_vector, p.tsq) > 0 then 1
        else 2
      end::int as m_tier,
      case
        when p.tsq is null then 0::real
        else (
          ts_rank_cd('{0.1,0.2,0.4,1.0}', v.search_vector, p.tsq)
          * case
              when p.raw is not null
               and strpos(lower(v.title), lower(p.raw)) > 0 then 2.5
              else 1
            end
          * case
              when v.published_at > now() - interval '14 days' then 1.3
              else 1
            end
          * case
              when v.is_featured
               and (v.featured_until is null or v.featured_until > now()) then 1.5
              else 1
            end
        )::real
      end as m_score,
      -- Рассеивание по компаниям для листинга без запроса: позиция вакансии
      -- внутри своей компании, нормированная на размер группы. Раньше это
      -- делал diversifyVacanciesByCompany() в приложении, но с пагинацией
      -- перемешивать можно только до LIMIT, то есть в SQL.
      row_number() over (
        partition by lower(btrim(v.company))
        order by
          (v.is_featured and (v.featured_until is null or v.featured_until > now())) desc,
          v.published_at desc
      ) as co_rn,
      count(*) over (partition by lower(btrim(v.company))) as co_cnt
    from public.vacancies v, p
    where v.is_published
      and (include_archived or not v.is_archived)
      and (p.tsq is null or v.search_vector @@ p.tsq)
      and (spheres is null or cardinality(spheres) = 0 or v.sphere          = any(spheres))
      and (cities  is null or cardinality(cities)  = 0 or v.city            = any(cities))
      and (exps    is null or cardinality(exps)    = 0 or v.exp             = any(exps))
      and (formats is null or cardinality(formats) = 0 or v.format          = any(formats))
      and (types   is null or cardinality(types)   = 0 or v.employment_type = any(types))
      and (
        (salary_from is null and salary_to is null)
        or (
          v.salary_min is not null
          and v.salary_max is not null
          and v.salary_min <= coalesce(salary_to, 999999999)
          and v.salary_max >= coalesce(salary_from, 0)
        )
      )
  ),
  counted as (
    -- Окно считается по всему найденному, до LIMIT и до фильтра по tier,
    -- поэтому тоталы верны на любой странице.
    select
      m.*,
      count(*) filter (where m.m_tier <= 1) over () as tot_primary,
      count(*) filter (where m.m_tier  = 2) over () as tot_mentions
    from matched m
  )
  select
    c.id, c.slug, c.title, c.company, c.description, c.description_blocks,
    c.sphere, c.exp, c.format, c.employment_type, c.salary_min, c.salary_max,
    c.apply_url, c.published_at, c.is_featured, c.featured_until, c.source,
    c.company_id, c.company_about, c.company_logo_url, c.city, c.skills,
    c.source_published_at, c.is_archived,
    c.m_tier      as match_tier,
    c.m_score     as match_score,
    c.tot_primary as total_primary,
    c.tot_mentions as total_mentions
  from counted c
  where only_tier is null
     or (only_tier = 1 and c.m_tier <= 1)
     or (only_tier = 2 and c.m_tier  = 2)
  order by
    c.m_tier asc,
    c.m_score desc,
    (c.is_featured and (c.featured_until is null or c.featured_until > now())) desc,
    -- рассеивание только для листинга без запроса
    case when c.m_tier = 0 then (c.co_rn - 0.5) / c.co_cnt end asc nulls last,
    c.published_at desc
  limit greatest(coalesce(per_page, 20), 1)
  offset greatest(coalesce(page, 1) - 1, 0) * greatest(coalesce(per_page, 20), 1)
$$;

-- ---------------------------------------------------------------------------
-- 3. search_vacancies_fuzzy(): фолбэк на опечатки
-- ---------------------------------------------------------------------------
-- Вызывается приложением ТОЛЬКО когда обычный поиск дал ноль: «аналитк» ->
-- «Младший аналитик данных». Триграммы по названию, порог 0.25 подобран так,
-- чтобы одна-две перепутанные буквы проходили, а случайный набор - нет.
create index if not exists vacancies_title_trgm_idx
  on public.vacancies using gin (title extensions.gin_trgm_ops);

create or replace function public.search_vacancies_fuzzy(
  q         text,
  max_rows  int default 12
)
returns table (
  id                  uuid,
  slug                text,
  title               text,
  company             text,
  description         text,
  description_blocks  jsonb,
  sphere              text,
  exp                 text,
  format              text,
  employment_type     text,
  salary_min          int,
  salary_max          int,
  apply_url           text,
  published_at        timestamptz,
  is_featured         boolean,
  featured_until      timestamptz,
  source              text,
  company_id          uuid,
  company_about       text,
  company_logo_url    text,
  city                text,
  skills              text[],
  source_published_at timestamptz,
  is_archived         boolean,
  match_tier          int,
  match_score         real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    v.id, v.slug, v.title, v.company, v.description, v.description_blocks,
    v.sphere, v.exp, v.format, v.employment_type, v.salary_min, v.salary_max,
    v.apply_url, v.published_at, v.is_featured, v.featured_until, v.source,
    v.company_id, v.company_about, v.company_logo_url, v.city, v.skills,
    v.source_published_at, v.is_archived,
    1::int as match_tier,
    similarity(v.title, q)::real as match_score
  from public.vacancies v
  where v.is_published
    and not v.is_archived
    and nullif(btrim(coalesce(q, '')), '') is not null
    and similarity(v.title, q) > 0.25
  order by similarity(v.title, q) desc, v.published_at desc
  limit greatest(coalesce(max_rows, 12), 1)
$$;

-- ---------------------------------------------------------------------------
-- 4. vacancy_facets(): счётчики фильтров по текущей выдаче
-- ---------------------------------------------------------------------------
-- Раньше счётчики считались по всей базе без учёта запроса и фильтров:
-- пользователь видел «Аналитика 181», кликал и получал 4. Теперь каждое
-- измерение считается на множестве, отфильтрованном всеми ОСТАЛЬНЫМИ
-- измерениями (drill-down): счётчик показывает, сколько добавится, а не
-- сколько было бы, если бы фильтров не было вовсе.
create or replace function public.vacancy_facets(
  q           text    default null,
  q_alts      text[]  default null,
  spheres     text[]  default null,
  cities      text[]  default null,
  exps        text[]  default null,
  formats     text[]  default null,
  types       text[]  default null,
  salary_from int     default null,
  salary_to   int     default null
)
returns table (dimension text, value text, cnt bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with p as (
    select public.combine_tsqueries(
      array_prepend(coalesce(q, ''), coalesce(q_alts, '{}'::text[]))
    ) as tsq
  ),
  base as (
    select
      v.sphere, v.city, v.exp, v.format, v.employment_type,
      (spheres is null or cardinality(spheres) = 0 or v.sphere          = any(spheres)) as ok_sphere,
      (cities  is null or cardinality(cities)  = 0 or v.city            = any(cities))  as ok_city,
      (exps    is null or cardinality(exps)    = 0 or v.exp             = any(exps))    as ok_exp,
      (formats is null or cardinality(formats) = 0 or v.format          = any(formats)) as ok_format,
      (types   is null or cardinality(types)   = 0 or v.employment_type = any(types))   as ok_type
    from public.vacancies v, p
    where v.is_published
      and not v.is_archived
      -- Считаем только основную выдачу (match_tier <= 1): счётчик должен
      -- совпадать с тем, что пользователь увидит после клика, а совпадения
      -- в тексте описания живут на отдельном экране.
      and (p.tsq is null or ts_rank_cd('{0,0,1,1}', v.search_vector, p.tsq) > 0)
      and (
        (salary_from is null and salary_to is null)
        or (
          v.salary_min is not null
          and v.salary_max is not null
          and v.salary_min <= coalesce(salary_to, 999999999)
          and v.salary_max >= coalesce(salary_from, 0)
        )
      )
  )
  select 'sphere'::text, sphere, count(*)
    from base where ok_city and ok_exp and ok_format and ok_type
     and coalesce(sphere, '') <> '' group by sphere
  union all
  select 'city', city, count(*)
    from base where ok_sphere and ok_exp and ok_format and ok_type
     and coalesce(city, '') <> '' group by city
  union all
  select 'exp', exp, count(*)
    from base where ok_sphere and ok_city and ok_format and ok_type
     and coalesce(exp, '') <> '' group by exp
  union all
  select 'format', format, count(*)
    from base where ok_sphere and ok_city and ok_exp and ok_type
     and coalesce(format, '') <> '' group by format
  union all
  select 'type', employment_type, count(*)
    from base where ok_sphere and ok_city and ok_exp and ok_format
     and coalesce(employment_type, '') <> '' group by employment_type
$$;

grant execute on function public.combine_tsqueries(text[]) to anon, authenticated, service_role;
grant execute on function public.search_vacancies(
  text, text[], text[], text[], text[], text[], text[], int, int, boolean, int, int, int
) to anon, authenticated, service_role;
grant execute on function public.search_vacancies_fuzzy(text, int)
  to anon, authenticated, service_role;
grant execute on function public.vacancy_facets(
  text, text[], text[], text[], text[], text[], text[], int, int
) to anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
