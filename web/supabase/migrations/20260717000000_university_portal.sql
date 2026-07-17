-- ============================================
-- Кабинет вуза, фаза 1: справочник вузов, членство ЦКС, приглашения,
-- учебный профиль студента (самодекларация)
--
-- ПРИМЕНЯТЬ РОЛЬЮ ПРИЛОЖЕНИЯ (DATABASE_URL, роль postgres) - тогда она
-- владелец таблиц, как у companies/user_profiles. Доступ - только прямой
-- Postgres (getSql); RLS включён без политик, через анонимный REST доступа нет.
--
-- Сид справочника вузов - в 20260717000100_universities_seed.sql.
-- Дизайн-документ: docs/vuz-portal-design.md
-- ============================================

-- Вузы (справочник + витрина). Заводит владелец платформы, самозаписи нет ----
create table if not exists public.universities (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  short_name    text,
  city          text,
  region        text,
  logo_url      text,
  description   text not null default '',
  contacts      jsonb not null default '{}',
  status        text not null default 'active'
    check (status in ('active', 'hidden')),
  public_stats  boolean not null default false,
  email_domains text[],
  created_by    uuid references public.careerlab_accounts(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Поиск по названию для селекта студента (ILIKE по name/short_name/city)
create index if not exists universities_name_idx
  on public.universities (lower(name));

alter table public.universities enable row level security;

-- Членство сотрудников ЦКС ---------------------------------------------------
create table if not exists public.university_members (
  university_id uuid not null references public.universities(id) on delete cascade,
  account_id    uuid not null references public.careerlab_accounts(id) on delete cascade,
  role          text not null check (role in ('owner', 'staff')),
  status        text not null default 'active' check (status in ('active', 'disabled')),
  invited_by    uuid,
  created_at    timestamptz not null default now(),
  primary key (university_id, account_id)
);

create index if not exists university_members_account_idx
  on public.university_members (account_id);

alter table public.university_members enable row level security;

-- Приглашения в ЦКС (механика как company_invites) ---------------------------
create table if not exists public.university_invites (
  id            uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  email         text not null,
  role          text not null check (role in ('owner', 'staff')),
  token_hash    text not null,
  invited_by    uuid,
  expires_at    timestamptz not null,
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (university_id, email)
);

create index if not exists university_invites_token_idx
  on public.university_invites (token_hash);

alter table public.university_invites enable row level security;

-- Учебный профиль студента (самодекларация, отдельно от user_profiles) -------
-- Студент выбрал вуз -> попадает в агрегаты этого вуза. Вуз видит ТОЛЬКО
-- агрегаты, никогда не поимённо (docs/vuz-portal-design.md §6).
create table if not exists public.student_profiles (
  account_id      uuid primary key references public.careerlab_accounts(id) on delete cascade,
  university_id   uuid references public.universities(id) on delete set null,
  faculty         text not null default '',
  study_year      smallint check (study_year between 1 and 6),
  graduation_year smallint check (graduation_year between 2000 and 2100),
  email_verified_domain boolean not null default false,
  updated_at      timestamptz not null default now()
);

create index if not exists student_profiles_university_idx
  on public.student_profiles (university_id);

alter table public.student_profiles enable row level security;
