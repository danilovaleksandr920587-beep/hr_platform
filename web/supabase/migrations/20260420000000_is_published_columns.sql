-- Единое имя колонки: is_published (как в типичных шаблонах Supabase / существующих проектах).
-- 1) Если таблицы созданы старой миграцией с `published` — переименовать.
-- 2) Обновить RLS и индексы под is_published.

-- vacancies -----------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vacancies' and column_name = 'published'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vacancies' and column_name = 'is_published'
  ) then
    alter table public.vacancies rename column published to is_published;
  end if;
end $$;

-- Снять все типичные политики чтения (старое имя + политика из корня репо / дашборда).
drop policy if exists "Public read published vacancies" on public.vacancies;
drop policy if exists vacancies_select_published on public.vacancies;

create policy vacancies_select_published
  on public.vacancies for select
  to anon, authenticated
  using (is_published = true);

drop index if exists public.vacancies_published_idx;
create index if not exists vacancies_is_published_idx
  on public.vacancies (is_published, published_at desc);

-- articles ------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'articles' and column_name = 'published'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'articles' and column_name = 'is_published'
  ) then
    alter table public.articles rename column published to is_published;
  end if;
end $$;

drop policy if exists "Public read published articles" on public.articles;
drop policy if exists articles_select_published on public.articles;

create policy articles_select_published
  on public.articles for select
  to anon, authenticated
  using (is_published = true);

drop index if exists public.articles_published_idx;
create index if not exists articles_is_published_idx
  on public.articles (is_published, published_at desc);
