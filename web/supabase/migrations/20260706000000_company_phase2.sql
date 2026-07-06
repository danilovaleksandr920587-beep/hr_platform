-- ============================================
-- Кабинет компании (B2B), фаза 2: роль admin + in-app уведомления
--
-- ПРИМЕНЯТЬ РОЛЬЮ ПРИЛОЖЕНИЯ (DATABASE_URL, роль postgres) - все таблицы
-- пользовательские, доступ только прямой Postgres (getSql), RLS без политик.
-- ============================================

-- Роль admin в матрице прав (owner > admin > recruiter) --------------------
alter table public.company_members
  drop constraint if exists company_members_role_check;
alter table public.company_members
  add constraint company_members_role_check
  check (role in ('owner', 'admin', 'recruiter'));

alter table public.company_invites
  drop constraint if exists company_invites_role_check;
alter table public.company_invites
  add constraint company_invites_role_check
  check (role in ('owner', 'admin', 'recruiter'));

-- In-app уведомления (колокольчик) -----------------------------------------
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  account_id uuid   not null references public.careerlab_accounts(id) on delete cascade,
  type       text   not null,
    -- application_new | application_status | company_invite
    -- | company_moderation | vacancy_moderation
  payload    jsonb  not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_account_idx
  on public.notifications (account_id, read_at, created_at desc);

alter table public.notifications enable row level security;

-- Настройки email-уведомлений по типам (для будущего email-дайджеста) -------
create table if not exists public.notification_prefs (
  account_id  uuid primary key references public.careerlab_accounts(id) on delete cascade,
  email_prefs jsonb not null default '{}',  -- {"application_new": true, ...}
  updated_at  timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;
