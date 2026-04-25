-- Добавляем поле apply_url в таблицу vacancies
-- Хранит прямую ссылку для отклика (карьерный сайт, Google Forms и т.д.)

alter table public.vacancies
  add column if not exists apply_url text default null;
