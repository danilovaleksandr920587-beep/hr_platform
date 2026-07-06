-- ============================================
-- Кабинет компании (B2B), фаза 1 - ЧАСТЬ 2: колонки vacancies
--
-- ПРИМЕНЯТЬ СУПЕРПОЛЬЗОВАТЕЛЕМ (владелец vacancies = supabase_admin).
-- На self-hosted Supabase (Beget):
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     -v ON_ERROR_STOP=1 --single-transaction \
--     < supabase/migrations/20260705000100_vacancies_company_columns.sql
-- либо через SQL editor в Supabase Studio.
--
-- Новые таблицы (companies и т.д.) - в 20260705000000_company_portal.sql
-- (применять ролью приложения postgres).
-- ============================================

alter table public.vacancies
  add column if not exists source        text not null default 'parser',
  add column if not exists company_id    uuid,
  add column if not exists status        text not null default 'published',
  add column if not exists status_reason text,
  add column if not exists apply_mode    text not null default 'external';

alter table public.vacancies
  drop constraint if exists vacancies_source_check;
alter table public.vacancies
  add constraint vacancies_source_check
  check (source in ('parser', 'company'));

alter table public.vacancies
  drop constraint if exists vacancies_status_check;
alter table public.vacancies
  add constraint vacancies_status_check
  check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived'));

alter table public.vacancies
  drop constraint if exists vacancies_apply_mode_check;
alter table public.vacancies
  add constraint vacancies_apply_mode_check
  check (apply_mode in ('external', 'internal'));

-- Существующие парсерные строки: статус из is_published
-- (инвариант: is_published = (status = 'published'))
update public.vacancies
set status = case when is_published then 'published' else 'draft' end
where source = 'parser';

create index if not exists vacancies_company_id_idx
  on public.vacancies (company_id) where company_id is not null;

-- Приложение подключается ролью postgres (BYPASSRLS) - явные GRANT не нужны;
-- записи вакансий компаний идут через service role (Supabase admin client).
