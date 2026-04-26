-- RLS follow-up for optional per-user tables.
-- This does NOT affect Yandex login flow directly.
-- Use when/if you introduce tables accessed by Supabase client with anon/authenticated roles.

with target_tables as (
  select unnest(array[
    'user_saved_vacancies',
    'user_saved_articles',
    'user_checklist_progress'
  ]) as table_name
)
select
  t.table_name,
  c.oid is not null as exists_in_db,
  c.relrowsecurity as rls_enabled,
  coalesce(p.policy_count, 0) as policy_count
from target_tables t
left join pg_class c
  on c.relname = t.table_name
left join pg_namespace n
  on n.oid = c.relnamespace and n.nspname = 'public'
left join (
  select tablename, count(*)::int as policy_count
  from pg_policies
  where schemaname = 'public'
  group by tablename
) p
  on p.tablename = t.table_name
order by t.table_name;
