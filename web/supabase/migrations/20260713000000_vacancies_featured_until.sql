-- ============================================
-- Платные закрепления вакансий: срок действия featured
--
-- ПРИМЕНЯТЬ СУПЕРПОЛЬЗОВАТЕЛЕМ (владелец vacancies = supabase_admin).
-- На self-hosted Supabase (Beget):
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     -v ON_ERROR_STOP=1 --single-transaction \
--     < supabase/migrations/20260713000000_vacancies_featured_until.sql
--
-- is_featured остаётся флагом «оплачено закрепление», featured_until - до какой
-- даты оно активно. Эффективное закрепление считается в приложении:
--   is_featured AND (featured_until IS NULL OR featured_until > now()).
-- NULL = бессрочно (для внутренних/редакционных закреплений).
-- ============================================

alter table public.vacancies
  add column if not exists featured_until timestamptz;

-- Индекс под сортировку активных закреплений
create index if not exists vacancies_featured_until_idx
  on public.vacancies (featured_until)
  where is_featured = true;
