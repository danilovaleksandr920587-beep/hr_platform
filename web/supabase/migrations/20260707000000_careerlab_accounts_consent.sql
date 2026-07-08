-- B-5 (152-ФЗ): хранение факта согласия на обработку персональных данных.
--
-- careerlab_accounts - ПОЛЬЗОВАТЕЛЬСКАЯ таблица (миграций для неё в проекте нет,
-- схема правится руками). Этот файл лежит здесь ДЛЯ ИСТОРИИ; на проде его нужно
-- выполнить ВРУЧНУЮ ролью приложения ДО деплоя кода регистрации, иначе INSERT
-- в register/route.ts упадёт на несуществующих колонках.
--
-- Владелец careerlab_accounts на проде - роль supabase_admin (НЕ postgres),
-- поэтому ALTER выполняем именно ей, иначе psql вернёт
-- "must be owner of table careerlab_accounts".
-- Применение на проде:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < 20260707000000_careerlab_accounts_consent.sql
--
-- consent_at      - момент, когда пользователь дал согласие (NULL у старых
--                   аккаунтов, зарегистрированных до внедрения фиксации согласия).
-- consent_version - редакция текста согласия (`/consent`), с которой согласились;
--                   совпадает с CONSENT_VERSION в web/lib/legal/consent.ts.

alter table public.careerlab_accounts
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text;
