-- Внутренняя аналитика: сырой поток событий (docs/ANALYTICS.md, фаза 1).
--
-- Применять РОЛЬЮ ПРИЛОЖЕНИЯ (DATABASE_URL, postgres) - как company_portal:
--   docker exec -i supabase-db psql -U postgres -d postgres --single-transaction \
--     < 20260830000000_analytics_events.sql
--
-- RLS включён без политик: анонимный PostgREST (anon/authenticated) читать не
-- может, роль postgres имеет BYPASSRLS и пишет из приложения.

create table if not exists public.analytics_events (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  event         text        not null,
  anon_id       uuid,
  session_id    uuid,
  account_id    uuid references public.careerlab_accounts(id) on delete set null,
  page_type     text,
  path          text,
  entity_type   text,
  entity_id     text,
  direction     text,
  level         text,
  city          text,
  format        text,
  channel       text,
  referrer_host text,
  utm           jsonb,
  device        text,
  props         jsonb
);

create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_created_idx
  on public.analytics_events (event, created_at desc);
create index if not exists analytics_events_direction_created_idx
  on public.analytics_events (direction, created_at desc)
  where direction is not null;
create index if not exists analytics_events_entity_idx
  on public.analytics_events (entity_type, entity_id, created_at desc)
  where entity_type is not null;
-- Уники за период считаются по anon_id внутри дня.
create index if not exists analytics_events_anon_created_idx
  on public.analytics_events (anon_id, created_at desc)
  where anon_id is not null;

alter table public.analytics_events enable row level security;

comment on table public.analytics_events is
  'Сырые события внутренней аналитики. Ретеншен 90 дней, агрегаты - в analytics_daily.';
comment on column public.analytics_events.anon_id is
  'First-party cookie cl_aid (12 мес). Не связан с личностью до логина, IP не хранится.';
