-- Агрегаты внутренней аналитики и ретеншен сырых событий
-- (docs/ANALYTICS.md, фаза 4).
--
-- Применять РОЛЬЮ ПРИЛОЖЕНИЯ (DATABASE_URL, postgres):
--   docker exec -i supabase-db psql -U postgres -d postgres --single-transaction \
--     < 20260830000100_analytics_rollup.sql
--
-- Роли таблиц:
--   analytics_events - сырьё, живёт 90 дней, из него считаются все отчёты
--                      дашборда (периоды до 90 дней);
--   analytics_daily  - суточные агрегаты, живут бессрочно. Нужны, чтобы после
--                      чистки сырья история не исчезала.
-- NULL в измерениях заменяется на '-', иначе строки не складываются в primary key.

create table if not exists public.analytics_daily (
  day           date not null,
  event         text not null,
  direction     text not null default '-',
  page_type     text not null default '-',
  channel       text not null default '-',
  device        text not null default '-',
  events        integer not null default 0,
  uniq_anon     integer not null default 0,
  uniq_sessions integer not null default 0,
  primary key (day, event, direction, page_type, channel, device)
);

create index if not exists analytics_daily_day_idx on public.analytics_daily (day desc);

alter table public.analytics_daily enable row level security;

/**
 * Пересчитывает последние p_days суток и чистит сырьё старше 90 дней.
 * Идемпотентна: пересчёт затирает уже посчитанные дни, поэтому пропущенный
 * запуск догоняется следующим (в пределах окна p_days).
 */
create or replace function public.analytics_rollup(p_days integer default 3)
returns void
language plpgsql
as $$
begin
  delete from public.analytics_daily
  where day >= (current_date - p_days);

  insert into public.analytics_daily
    (day, event, direction, page_type, channel, device, events, uniq_anon, uniq_sessions)
  select
    (created_at at time zone 'Europe/Moscow')::date,
    event,
    coalesce(direction, '-'),
    coalesce(page_type, '-'),
    coalesce(channel, '-'),
    coalesce(device, '-'),
    count(*)::int,
    count(distinct anon_id)::int,
    count(distinct session_id)::int
  from public.analytics_events
  where created_at >= (current_date - p_days)::timestamptz
  group by 1, 2, 3, 4, 5, 6;

  delete from public.analytics_events
  where created_at < now() - interval '90 days';
end;
$$;

comment on function public.analytics_rollup(integer) is
  'Ночной пересчёт analytics_daily + чистка analytics_events старше 90 дней.';
