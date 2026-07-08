-- Email verification (double opt-in) + смена email.
-- Владелец careerlab_accounts - supabase_admin, поэтому катить этот файл
-- суперпользователем:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     --single-transaction < 20260708000000_email_verification.sql

-- 1) Флаг подтверждения email на аккаунте.
alter table careerlab_accounts
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verified_at timestamptz;

-- Грандфазерим уже существующие аккаунты: они пользуются платформой,
-- переподтверждать их email не нужно (и это не жжёт репутацию домена).
update careerlab_accounts
  set email_verified = true,
      email_verified_at = coalesce(email_verified_at, created_at, now())
  where email_verified = false;

-- 2) Токены подтверждения email.
--    new_email IS NULL      -> подтверждение текущего email аккаунта.
--    new_email IS NOT NULL  -> смена email: при подтверждении email аккаунта
--                              меняется на new_email (ссылка ушла на new_email).
create table if not exists careerlab_email_verifications (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references careerlab_accounts(id) on delete cascade,
  new_email    text,
  token_hash   text not null,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  created_at   timestamptz not null default now(),
  requested_ip text
);

create index if not exists idx_email_verifications_token
  on careerlab_email_verifications (token_hash);
create index if not exists idx_email_verifications_account
  on careerlab_email_verifications (account_id, created_at desc);
