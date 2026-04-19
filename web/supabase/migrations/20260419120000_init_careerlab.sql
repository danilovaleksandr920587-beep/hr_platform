-- CareerLab: vacancies + articles, RLS, seed (run via Supabase CLI or SQL editor)

create extension if not exists "pgcrypto";

-- Vacancies ---------------------------------------------------------------
create table if not exists public.vacancies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  company text not null,
  description text,
  sphere text not null check (sphere in ('it', 'design', 'marketing', 'analytics')),
  exp text not null check (exp in ('none', 'lt1', '1-3', 'gte3')),
  format text not null check (format in ('remote', 'hybrid', 'office')),
  type text not null check (type in ('internship', 'project', 'parttime')),
  salary_min integer,
  salary_max integer,
  search_document text not null default '',
  featured boolean not null default false,
  is_published boolean not null default true,
  published_at timestamptz not null default now()
);

create index if not exists vacancies_is_published_idx on public.vacancies (is_published, published_at desc);
create index if not exists vacancies_sphere_idx on public.vacancies (sphere);
create index if not exists vacancies_exp_idx on public.vacancies (exp);
create index if not exists vacancies_format_idx on public.vacancies (format);
create index if not exists vacancies_type_idx on public.vacancies (type);

-- Articles ----------------------------------------------------------------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  level text not null,
  read_time integer not null default 5,
  excerpt text not null default '',
  body text not null default '',
  is_new boolean not null default false,
  cat_slug text not null default 'resume' check (cat_slug in ('resume', 'interview', 'test', 'salary')),
  layout text default null,
  is_published boolean not null default true,
  published_at timestamptz not null default now()
);

create index if not exists articles_is_published_idx on public.articles (is_published, published_at desc);
create index if not exists articles_category_idx on public.articles (category);

-- RLS ---------------------------------------------------------------------
alter table public.vacancies enable row level security;
alter table public.articles enable row level security;

create policy vacancies_select_published
  on public.vacancies for select
  to anon, authenticated
  using (is_published = true);

create policy articles_select_published
  on public.articles for select
  to anon, authenticated
  using (is_published = true);

-- Service role bypasses RLS by default in Supabase

-- Seed vacancies (subset aligned with legacy static site)
insert into public.vacancies (slug, title, company, description, sphere, exp, format, type, salary_min, salary_max, search_document, featured)
values
  ('mladshij-produktovyj-analitik-nova', 'Младший продуктовый аналитик', 'Nova Bank', 'Помощь командам продуктов в метриках, гипотезах и дашбордах.', 'analytics', 'lt1', 'hybrid', 'internship', 80000, 100000, 'младший продуктовый аналитик nova bank sql excel дашборд метрики', true),
  ('stazher-frontend-react-orbit', 'Стажёр Frontend (React)', 'Orbit Tech', 'Верстка и логика на React, код-ревью с синьором.', 'it', 'none', 'remote', 'internship', 45000, 55000, 'стажёр frontend react orbit tech typescript git', false),
  ('stazher-data-analyst-core', 'Стажёр Data Analyst', 'Data Core', 'Сбор и чистка данных, простые модели и отчёты.', 'analytics', 'none', 'office', 'internship', null, null, 'стажёр data analyst data core bi статистика', false),
  ('ux-ui-stazher-frame', 'UX/UI стажёр', 'Frame Studio', 'Исследования пользователей, прототипы в Figma.', 'design', 'none', 'hybrid', 'internship', 40000, 50000, 'ux ui figma стажёр frame дизайн', false),
  ('smm-menedzher-pulse', 'SMM-менеджер (подработка)', 'Pulse Agency', 'Контент-планы, сторис, отчёты по охватам.', 'marketing', '1-3', 'remote', 'parttime', 30000, 40000, 'smm маркетинг контент pulse подработка', false),
  ('junior-backend-java-north', 'Junior Backend (Java)', 'North IT', 'Микросервисы, Spring Boot, покрытие тестами.', 'it', 'lt1', 'office', 'internship', 90000, 110000, 'java backend junior north spring', false),
  ('stazher-ml-neural', 'Стажёр ML Engineer', 'Neural Labs', 'Эксперименты с моделями, подготовка датасетов.', 'it', 'none', 'remote', 'internship', 60000, 80000, 'ml pytorch python стажёр нейросети', false),
  ('growth-marketolog-lift', 'Growth-маркетолог (проект)', 'Lift Co', 'Воронки роста, A/B-тесты, работа с аналитикой.', 'marketing', '1-3', 'hybrid', 'project', 70000, 90000, 'growth маркетинг ab тест lift', false),
  ('stazher-produktovyj-dizajn-mono', 'Стажёр продуктового дизайна', 'Mono', 'Дизайн-система, адаптив, работа с разработчиками.', 'design', 'lt1', 'remote', 'internship', 50000, 70000, 'продуктовый дизайн figma mono стажёр', false),
  ('finansovyj-analitik-stazher-ledger', 'Финансовый аналитик (стажёр)', 'Ledger Fin', 'Отчёты P&L, модели в Excel, бюджетирование.', 'analytics', 'none', 'office', 'internship', null, null, 'финансы аналитик excel бюджет ledger', false),
  ('qa-stazher-bugless', 'QA Engineer (стажёр)', 'Bugless', 'Ручное тестирование, чек-листы, регресс.', 'it', 'none', 'hybrid', 'internship', 55000, 65000, 'qa тестирование стажёр bugless postman', false),
  ('kopirajter-wordshop', 'Копирайтер рекламы (подработка)', 'Wordshop', 'Тексты для соцсетей и лендингов.', 'marketing', 'none', 'remote', 'parttime', 25000, 35000, 'копирайтер тексты реклама wordshop', false),
  ('data-engineer-stream', 'Data Engineer (проект)', 'Stream Analytics', 'ETL-пайплайны, Airflow, DWH.', 'analytics', 'gte3', 'office', 'project', 120000, 150000, 'data engineer etl airflow stream sql', false)
on conflict (slug) do nothing;

-- Seed articles
insert into public.articles (slug, title, category, level, read_time, excerpt, body, is_new, cat_slug, layout)
values
  ('studencheskoe-rezyume-proekty', 'Студенческое резюме: проекты, которые рекрутеры читают', 'Резюме', 'Новичок', 8, 'Шаблон блоков под системы отбора и живой просмотр рекрутера.', '# Гайд', false, 'resume', null),
  ('ats-i-klyuchevye-slova', 'ATS и ключевые слова: без спама и перегруза', 'Резюме', 'Продвинутый', 11, 'Как проходить автоматический отбор и оставаться читаемым.', '# Гайд', true, 'resume', 'wide'),
  ('povedencheskie-voprosy', 'Поведенческие вопросы: отвечать уверенно', 'Собеседование', 'Новичок', 6, 'Три скелета ответа — чтобы звучать естественно.', '# Гайд', false, 'interview', null),
  ('sistemnyj-dizajn-na-sobese', 'Системный дизайн на собесе', 'Собеседование', 'Продвинутый', 14, 'Уточняющие вопросы и рамка задачи.', '# Гайд', false, 'interview', null),
  ('testovoe-zadanie-srok', 'Тестовое задание: как оценить срок и не сгореть', 'Тестовые', 'Новичок', 9, 'Таблица критериев готовности и письмо рекрутеру.', '# Гайд', true, 'test', 'wide-checklist'),
  ('live-coding-mini-chekllist', 'Live coding: мини-чеклист перед экраном', 'Тестовые', 'Продвинутый', 5, 'Инструменты, нейминг, граничные случаи.', '# Гайд', false, 'test', null),
  ('pervyj-razgovor-o-zarplate', 'Первый разговор о зарплате: цифры без стресса', 'Зарплата', 'Новичок', 7, 'Диапазон, аргументы и формулировки.', '# Гайд', false, 'salary', null),
  ('offer-i-paket-gross', 'Оффер и пакет: что сравнивать кроме gross', 'Зарплата', 'Продвинутый', 10, 'Бонусы, ДМС, гибрид и рост.', '# Гайд', false, 'salary', 'wide')
on conflict (slug) do nothing;
