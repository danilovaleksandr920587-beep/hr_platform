create table if not exists public.careerlab_password_resets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.careerlab_accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  requested_ip text,
  created_at timestamptz not null default now()
);

create index if not exists careerlab_password_resets_account_idx
  on public.careerlab_password_resets (account_id, created_at desc);

create index if not exists careerlab_password_resets_expires_idx
  on public.careerlab_password_resets (expires_at);
