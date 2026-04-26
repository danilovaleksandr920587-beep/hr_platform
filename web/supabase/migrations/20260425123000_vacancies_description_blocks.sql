alter table public.vacancies
  add column if not exists description_blocks jsonb;

