alter table public.vacancies
  drop constraint if exists vacancies_sphere_check;

alter table public.vacancies
  add constraint vacancies_sphere_check
  check (
    sphere in (
      'it',
      'design',
      'marketing',
      'analytics',
      'product',
      'sales',
      'support',
      'hr',
      'finance',
      'operations',
      'security',
      'devops',
      'legal'
    )
  );
