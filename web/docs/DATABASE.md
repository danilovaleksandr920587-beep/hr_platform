# База данных

Один Postgres (Supabase self-hosted на Beget), но два способа доступа:

1. **Supabase-клиент** (`lib/supabase/*`) - контентные таблицы, anon-ключ,
   чтение через RLS (только `is_published = true`)
2. **Прямой Postgres** (`lib/db/postgres.ts`, env `DATABASE_URL`) -
   пользовательские таблицы, только на сервере

## Контентные таблицы (есть миграции в `supabase/migrations/`)

### `vacancies`
Вакансии. Ключевые поля: `slug` (unique), `title`, `company`, `description`,
фильтры `sphere` (it/design/marketing/analytics + расширение во 2-й миграции),
`exp` (none/lt1/1-3/gte3), `format` (remote/hybrid/office),
`employment_type` (internship/project/parttime), `salary_min/max`,
`bonus_tags[]`, флаги `is_published/is_featured/is_new`, `search_vector`
(tsvector russian, GIN-индекс).

B2B-колонки (миграция `20260705000000_company_portal.sql`): `source`
(parser/company), `company_id`, `status` (draft/pending_review/published/
rejected/archived), `status_reason`, `apply_mode` (external/internal).
Инварианты: published/archived -> is_published=true; archived -> is_archived=true
(страница живёт для SEO); draft/pending_review/rejected -> is_published=false.

### `articles`
Статьи базы знаний. Ключевые поля: `slug` (unique), `title`, `category`,
`cat_slug`, `level` (Новичок/Продвинутый), `read_time`, `excerpt`, `body`
(markdown/html), `tags[]`, `layout`, `visual_icon`, `visual_stat`,
`is_published/is_new`, `search_vector`.

Записи в обе таблицы - только через service role (см. `lib/supabase/admin.ts`
и пайплайн `article_pipeline.py` в соседнем проекте /Users/user/claude).

## Пользовательские таблицы (миграций НЕТ, созданы вручную в БД)

| Таблица | Поля (из кода) | Назначение |
|---------|----------------|------------|
| `careerlab_accounts` | id, email, display_name, password_hash | Аккаунты (email или Яндекс) |
| `careerlab_password_resets` | account_id, token_hash, expires_at, requested_ip | Токены восстановления |
| `user_profiles` | account_id, first_name, surname, direction, level, format, city | Анкета в кабинете |
| `user_saved_vacancies` | account_id, slug | Сохранённые вакансии |
| `user_saved_articles` | account_id, slug | Сохранённые статьи |
| `user_checklist_progress` | account_id, ... | Прогресс чек-листа |
| `user_resume_analyses` | account_id, score, result_json, target_role | История AI-анализов резюме |

ВАЖНО: при изменении этих таблиц менять схему нужно руками в БД - и лучше
завести миграцию, чтобы уйти от ручного состояния.

## B2B-таблицы (миграция `web/supabase/migrations/20260705000000_company_portal.sql`)

Доступ - только прямой Postgres (`lib/company/*`). RLS включён без политик:
через анонимный PostgREST данные недоступны.

| Таблица | Ключевые поля | Назначение |
|---------|---------------|------------|
| `companies` | slug, name, inn (unique), status (pending/verified/rejected/blocked), status_reason, trusted, created_by | Компании; trusted = автопубликация вакансий без премодерации |
| `company_members` | company_id + account_id (PK), role (owner/recruiter), status (active/disabled) | Членство и роли |
| `company_invites` | company_id + email (unique), role, token_hash (sha256), expires_at (7 дней), accepted_at | Приглашения в команду |
| `applications` | vacancy_slug + account_id (unique), company_id, resume_file, cover_letter, contact, status (new/viewed/invited/rejected/withdrawn), status_note | Отклики; resume_file - имя файла в RESUME_STORAGE_DIR |

Файлы резюме: `RESUME_STORAGE_DIR` (по умолчанию `web/storage/resumes/`,
в git не попадает), отдача только через `/api/applications/[id]/resume`.

## Env-переменные (значения - в `web/.env.local` на сервере, НЕ в git)

| Переменная | Для чего |
|------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, попадают в клиентский бандл |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY` | Записи в контентные таблицы, server-only |
| `DATABASE_URL` | Прямой Postgres для auth/кабинета |
| `AUTH_SECRET` | Подпись JWT session-cookie |
| `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` | Яндекс OAuth |
| `YANDEX_GPT_API_KEY`, `YANDEX_GPT_FOLDER_ID` | YandexGPT (анализ резюме) |
| `SMTP_*` | Почта: восстановление пароля + B2B-уведомления (отклики, инвайты, модерация) |
| `NEXT_PUBLIC_SITE_URL` | Канонический URL (https://lab-career.ru) |
| `PLATFORM_ADMIN_EMAILS` | Email админов платформы через запятую: доступ к /admin/moderation и письма о новых компаниях/вакансиях |
| `RESUME_STORAGE_DIR` | Каталог файлов резюме откликов (опционально, дефолт `web/storage/resumes`) |
