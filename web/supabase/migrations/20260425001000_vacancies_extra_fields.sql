alter table public.vacancies
  add column if not exists city text,
  add column if not exists skills text[] default '{}',
  add column if not exists source_published_at timestamptz,
  add column if not exists company_logo_url text;

