-- Expand article cluster taxonomy for new knowledge base structure
-- New cat_slug values: apply (Отклики), career (Карьера и рост)

alter table public.articles
  drop constraint if exists articles_cat_slug_check;

alter table public.articles
  add constraint articles_cat_slug_check
  check (cat_slug in ('resume', 'interview', 'test', 'salary', 'apply', 'career'));
