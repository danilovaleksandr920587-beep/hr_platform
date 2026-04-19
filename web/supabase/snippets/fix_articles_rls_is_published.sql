-- Выполните в Supabase → SQL → New query, если в логах Postgres:
--   column articles.published does not exist
-- Чаще всего политика RLS всё ещё ссылается на старое имя колонки `published`
-- после переименования в `is_published`.

drop policy if exists "Public read published articles" on public.articles;
drop policy if exists articles_select_published on public.articles;

create policy articles_select_published
  on public.articles
  for select
  to anon, authenticated
  using (is_published = true);
