-- ============================================
-- Кабинет компании (B2B), фаза 1 - ЧАСТЬ 1: новые таблицы
-- компании, команда, приглашения, отклики
--
-- ПРИМЕНЯТЬ РОЛЬЮ ПРИЛОЖЕНИЯ (DATABASE_URL, роль postgres) - тогда она
-- владелец таблиц, как у user_profiles. Доступ к таблицам - только прямой
-- Postgres (getSql); RLS включён без политик, через анонимный REST доступа нет.
--
-- Колонки vacancies (source/company_id/status/apply_mode) - в отдельном файле
-- 20260705000100_vacancies_company_columns.sql (владелец vacancies -
-- supabase_admin, применять суперпользователем).
-- ============================================

-- Компании ------------------------------------------------------------
create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  inn           text,
  website       text,
  logo_url      text,
  description   text not null default '',
  status        text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'blocked')),
  status_reason text,
  trusted       boolean not null default false,
  created_by    uuid references public.careerlab_accounts(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists companies_inn_uidx
  on public.companies (inn) where inn is not null and inn <> '';

alter table public.companies enable row level security;

-- Членство в компании ---------------------------------------------------
create table if not exists public.company_members (
  company_id  uuid not null references public.companies(id) on delete cascade,
  account_id  uuid not null references public.careerlab_accounts(id) on delete cascade,
  role        text not null check (role in ('owner', 'recruiter')),
  status      text not null default 'active' check (status in ('active', 'disabled')),
  invited_by  uuid,
  created_at  timestamptz not null default now(),
  primary key (company_id, account_id)
);

create index if not exists company_members_account_idx
  on public.company_members (account_id);

alter table public.company_members enable row level security;

-- Приглашения в команду ---------------------------------------------------
create table if not exists public.company_invites (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('owner', 'recruiter')),
  token_hash  text not null,
  invited_by  uuid,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (company_id, email)
);

create index if not exists company_invites_token_idx
  on public.company_invites (token_hash);

alter table public.company_invites enable row level security;

-- Отклики -----------------------------------------------------------------
-- vacancy_slug ссылается на vacancies логически (без FK: контентная таблица
-- живёт за PostgREST, целостность держим в приложении, как у saved_vacancies)
create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  vacancy_slug text not null,
  company_id   uuid not null references public.companies(id) on delete cascade,
  account_id   uuid not null references public.careerlab_accounts(id) on delete cascade,
  resume_file  text,
  cover_letter text not null default '',
  contact      text not null default '',
  status       text not null default 'new'
    check (status in ('new', 'viewed', 'invited', 'rejected', 'withdrawn')),
  status_note  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (vacancy_slug, account_id)
);

create index if not exists applications_company_idx
  on public.applications (company_id, status, created_at desc);
create index if not exists applications_account_idx
  on public.applications (account_id, created_at desc);

alter table public.applications enable row level security;

-- Колонки vacancies - в 20260705000100_vacancies_company_columns.sql
-- (владелец vacancies = supabase_admin, применять суперпользователем).
