-- Поиск по вакансиям: full-text search вместо ILIKE '%q%'.
--
-- Владелец public.vacancies = supabase_admin, поэтому применять суперпользователем:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres --single-transaction \
--     < web/supabase/migrations/20260809000000_vacancy_search.sql
--
-- Что было не так (замеры в docs/SEARCH_AUDIT.md):
--   * поиск шёл подстрокой по title/company/description без ранжирования;
--     по «python» 160 результатов, из них 16 релевантных, первый на 6-й позиции;
--   * '%java%' матчил JavaScript, 'python разработчик' находил 1 вакансию,
--     'разработчик python' - ноль (ILIKE требует буквального соседства);
--   * колонка search_vector в проде существовала обычной (не generated) и была
--     сплошь NULL, GIN-индекса на ней не было вообще.

begin;

-- ---------------------------------------------------------------------------
-- 0. immutable-обёртка над array_to_string
-- ---------------------------------------------------------------------------
-- array_to_string помечен STABLE (в общем случае output-функция элемента может
-- зависеть от настроек сессии), а generated-колонка требует IMMUTABLE. Для
-- text[] преобразование детерминировано, поэтому оборачиваем явно.
create or replace function public.immutable_array_to_string(arr text[], sep text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select coalesce(array_to_string(arr, sep), '')
$$;

-- ---------------------------------------------------------------------------
-- 1. search_vector: обычная колонка со значениями NULL -> generated с весами
-- ---------------------------------------------------------------------------
-- ALTER ... SET GENERATED для сохранённых колонок в PG 15 нет, поэтому
-- пересоздаём. Данных не теряем: колонка не заполнялась и нигде не читалась.
alter table public.vacancies drop column if exists search_vector;

alter table public.vacancies
  add column search_vector tsvector generated always as (
    setweight(to_tsvector('russian', coalesce(title, '')), 'A')
    || setweight(to_tsvector('russian', coalesce(company, '')), 'B')
    || setweight(to_tsvector('russian', coalesce(city, '')), 'B')
    || setweight(
         to_tsvector('russian', public.immutable_array_to_string(skills, ' ')),
         'B'
       )
    || setweight(to_tsvector('russian', coalesce(description, '')), 'C')
  ) stored;

create index if not exists vacancies_search_vector_idx
  on public.vacancies using gin (search_vector);

-- Индексы под фильтры были в supabase/migrations/20260419000000_*, но в прод
-- не доехали (таблица собиралась руками). Досоздаём.
create index if not exists vacancies_published_at_desc_idx
  on public.vacancies (published_at desc)
  where is_published;

create index if not exists vacancies_filters_idx
  on public.vacancies (sphere, exp, format, employment_type)
  where is_published;

-- ---------------------------------------------------------------------------
-- 2. search_vacancies(): матчинг + ранжирование + фильтры одним запросом
-- ---------------------------------------------------------------------------
-- security invoker: RLS-политика «Public read vacancies» (is_published = true)
-- продолжает действовать для anon, как и при обычном SELECT через PostgREST.
--
-- match_tier - на чём совпало:
--   1 - название / компания / город / стек (веса A и B) -> основная выдача
--   2 - только описание (вес C)                          -> блок «ещё упоминают»
--   0 - запроса нет, обычный листинг
--
-- match_score - ts_rank_cd по весам {D,C,B,A} с бустами: точное вхождение
-- строки запроса в заголовок, свежесть (14 дней), активное закрепление.
-- Бусты множители, а не слагаемые: закреплённая нерелевантная вакансия не
-- обгоняет релевантную, потому что стартует с почти нулевого ранга.
create or replace function public.search_vacancies(
  q                text    default null,
  spheres          text[]  default null,
  cities           text[]  default null,
  exps             text[]  default null,
  formats          text[]  default null,
  types            text[]  default null,
  salary_from      int     default null,
  salary_to        int     default null,
  include_archived boolean default false,
  max_rows         int     default 500
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
set search_path = public
as $$
  with p as (
    select
      nullif(btrim(coalesce(q, '')), '')                        as raw,
      -- numnode = 0 -> запрос состоял только из стоп-слов: считаем, что
      -- поиска нет, иначе @@ не найдёт ничего и страница будет пустой.
      case
        when nullif(btrim(coalesce(q, '')), '') is null then null
        when numnode(websearch_to_tsquery('russian', q)) = 0 then null
        else websearch_to_tsquery('russian', q)
      end                                                       as tsq
  )
  select
    v.id, v.slug, v.title, v.company, v.description, v.description_blocks,
    v.sphere, v.exp, v.format, v.employment_type, v.salary_min, v.salary_max,
    v.apply_url, v.published_at, v.is_featured, v.featured_until, v.source,
    v.company_id, v.company_about, v.company_logo_url, v.city, v.skills,
    v.source_published_at, v.is_archived,
    case
      when p.tsq is null then 0
      -- веса {D,C,B,A}: обнуляем C, значит ранг > 0 только при попадании в A/B
      when ts_rank_cd('{0,0,1,1}', v.search_vector, p.tsq) > 0 then 1
      else 2
    end::int as match_tier,
    case
      when p.tsq is null then 0::real
      else (
        ts_rank_cd('{0.1,0.2,0.4,1.0}', v.search_vector, p.tsq)
        * case
            when strpos(lower(v.title), lower(p.raw)) > 0 then 2.5
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
    end as match_score
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
  order by
    match_tier asc,
    match_score desc,
    (v.is_featured and (v.featured_until is null or v.featured_until > now())) desc,
    v.published_at desc
  limit greatest(coalesce(max_rows, 500), 1)
$$;

grant execute on function public.search_vacancies(
  text, text[], text[], text[], text[], text[], int, int, boolean, int
) to anon, authenticated, service_role;

commit;

-- PostgREST кеширует схему: без этого новый RPC отдаёт 404 до перезапуска.
notify pgrst, 'reload schema';
