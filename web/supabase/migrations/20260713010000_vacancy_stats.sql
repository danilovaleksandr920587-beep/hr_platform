-- ============================================
-- Статистика вакансий: просмотры и клики «Откликнуться»
--
-- ПРИМЕНЯТЬ РОЛЬЮ ПРИЛОЖЕНИЯ (DATABASE_URL, postgres) - она станет владельцем:
--   docker exec -i supabase-db psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 --single-transaction \
--     < supabase/migrations/20260713010000_vacancy_stats.sql
--
-- Таблица пользовательская (прямой Postgres, lib/company/stats.ts), не Supabase-
-- контент. Связь с vacancies - по slug на уровне приложения, без FK (разные
-- владельцы схем). Для дашборда работодателя: аргумент продления размещения.
-- ============================================

create table if not exists vacancy_stats (
  vacancy_slug text primary key,
  views        bigint not null default 0,
  apply_clicks bigint not null default 0,
  updated_at   timestamptz not null default now()
);
