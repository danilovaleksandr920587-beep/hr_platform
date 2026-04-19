-- Список политик RLS для public.articles (Supabase / Postgres 15+)

-- Простой вариант:
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'articles';

-- Через pg_policy (если нужны только сырые выражения):
select
  pol.polname as policy_name,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'articles';
