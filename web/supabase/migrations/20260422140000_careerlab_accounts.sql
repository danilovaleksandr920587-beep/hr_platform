-- Локальные аккаунты (email + имя + пароль), без Supabase Auth

create table if not exists public.careerlab_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists careerlab_accounts_email_lower_idx
  on public.careerlab_accounts (lower(email));
