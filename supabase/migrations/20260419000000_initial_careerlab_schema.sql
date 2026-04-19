-- CareerLab: vacancies + knowledge-base articles (public read, writes via service role)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- vacancies (filters align with vacancies.html)
-- ---------------------------------------------------------------------------
create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  company text not null,
  description text not null,
  sphere text not null
    check (sphere in ('it', 'design', 'marketing', 'analytics')),
  exp text not null
    check (exp in ('none', 'lt1', '1-3', 'gte3')),
  format text not null
    check (format in ('remote', 'hybrid', 'office')),
  employment_type text not null
    check (employment_type in ('internship', 'project', 'parttime')),
  salary_min integer,
  salary_max integer,
  bonus_tags text[] not null default '{}'::text[],
  search_vector tsvector generated always as (
    setweight(to_tsvector('russian', coalesce(title, '')), 'A')
    || setweight(to_tsvector('russian', coalesce(company, '')), 'B')
    || setweight(to_tsvector('russian', coalesce(description, '')), 'C')
  ) stored,
  published_at timestamptz not null default now(),
  is_published boolean not null default true,
  is_featured boolean not null default false,
  is_new boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vacancies_salary_range check (
    salary_min is null
    or salary_max is null
    or salary_min <= salary_max
  )
);

comment on table public.vacancies is 'Job listings; employment_type matches HTML data-type (internship|project|parttime).';
comment on column public.vacancies.employment_type is 'Maps to vacancy card data-type filter.';

create index vacancies_published_at_desc_idx
  on public.vacancies (published_at desc)
  where is_published;

create index vacancies_filters_idx
  on public.vacancies (sphere, exp, format, employment_type)
  where is_published;

create index vacancies_search_vector_idx
  on public.vacancies using gin (search_vector);

-- ---------------------------------------------------------------------------
-- articles (knowledge base)
-- ---------------------------------------------------------------------------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  level text not null
    check (level in ('Новичок', 'Продвинутый')),
  read_time integer not null,
  excerpt text not null,
  body text not null,
  cat_slug text,
  tags text[] not null default '{}'::text[],
  layout text,
  visual_icon text,
  visual_stat text,
  search_vector tsvector generated always as (
    setweight(to_tsvector('russian', coalesce(title, '')), 'A')
    || setweight(to_tsvector('russian', coalesce(excerpt, '')), 'B')
    || setweight(to_tsvector('russian', coalesce(body, '')), 'C')
  ) stored,
  published_at timestamptz not null default now(),
  is_published boolean not null default true,
  is_new boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_read_time_positive check (read_time > 0)
);

comment on table public.articles is 'Knowledge-base guides; slug can match legacy ?id= for redirects.';

create index articles_published_at_desc_idx
  on public.articles (published_at desc)
  where is_published;

create index articles_category_idx
  on public.articles (category)
  where is_published;

create index articles_level_idx
  on public.articles (level)
  where is_published;

create index articles_cat_slug_idx
  on public.articles (cat_slug)
  where is_published;

create index articles_search_vector_idx
  on public.articles using gin (search_vector);

-- ---------------------------------------------------------------------------
-- RLS: anonymous + authenticated may only read published rows
-- ---------------------------------------------------------------------------
alter table public.vacancies enable row level security;
alter table public.articles enable row level security;

create policy vacancies_select_published
  on public.vacancies
  for select
  to anon, authenticated
  using (is_published = true);

create policy articles_select_published
  on public.articles
  for select
  to anon, authenticated
  using (is_published = true);

-- Writes: use Supabase service role (bypasses RLS) or add explicit policies later.

grant select on table public.vacancies to anon, authenticated;
grant select on table public.articles to anon, authenticated;
