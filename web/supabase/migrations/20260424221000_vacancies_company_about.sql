-- Add separate company overview field for vacancy detail page
alter table public.vacancies
  add column if not exists company_about text default null;

