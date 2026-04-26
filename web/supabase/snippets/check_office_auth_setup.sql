-- Verify office auth tables/migrations in the connected database.
-- Expected result: all checks return true.

select
  to_regclass('public.careerlab_accounts') is not null as has_careerlab_accounts,
  to_regclass('public.careerlab_password_resets') is not null as has_careerlab_password_resets;

select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'careerlab_accounts'
      and column_name in ('id', 'email', 'display_name', 'password_hash')
    group by table_name
    having count(*) = 4
  ) as has_required_careerlab_accounts_columns;
