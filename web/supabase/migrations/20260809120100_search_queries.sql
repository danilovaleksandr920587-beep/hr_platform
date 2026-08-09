-- Лог поисковых запросов. Пользовательская таблица, поэтому применять РОЛЬЮ
-- ПРИЛОЖЕНИЯ (DATABASE_URL, postgres) - она станет владельцем, как у остальных
-- таблиц из lib/db:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f web/supabase/migrations/20260809120100_search_queries.sql
--
-- Зачем: без лога нельзя ответить, стало ли лучше, и не видно дыр в словаре
-- алиасов (lib/search/query.ts). Первый нужный отчёт - запросы с нулём
-- результатов, см. docs/SEARCH_AUDIT.md.

create table if not exists public.search_queries (
  id             bigint generated always as identity primary key,
  q              text        not null,
  results_count  int         not null default 0,
  mentions_count int         not null default 0,
  fuzzy_used     boolean     not null default false,
  filters        jsonb       not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists search_queries_created_at_idx
  on public.search_queries (created_at desc);

-- Для отчёта «что ищут и что даёт ноль»
create index if not exists search_queries_zero_idx
  on public.search_queries (lower(q))
  where results_count = 0;

-- RLS включён без политик: анонимный PostgREST (anon/authenticated) не видит
-- таблицу, роль приложения (postgres, BYPASSRLS) пишет и читает.
alter table public.search_queries enable row level security;
