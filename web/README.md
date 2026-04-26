# CareerLab (Next.js + Supabase)

Публичные страницы с **SSR/ISR** и данными из Supabase, защита `/office` через middleware и cookie `careerlab_session`.

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните значения из [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — обязательны для списков и деталок.
- `NEXT_PUBLIC_SITE_URL` — канонический URL (например `https://your-domain.vercel.app`) для `metadataBase`, sitemap и корректного `emailRedirectTo` при magic link.
- `SUPABASE_SERVICE_ROLE_KEY` — только на сервере; в этом шаблоне UI его не использует.
- `DATABASE_URL`, `AUTH_SECRET` — обязательны для локальной email/password авторизации кабинета.
- `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `YANDEX_REDIRECT_URI` — обязательны для входа через Яндекс.
- SMTP для восстановления пароля (server-only):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - опционально `MAIL_APP_NAME` (по умолчанию `CareerLab`)

Для OAuth важно выбрать один канонический домен (например, `https://lab-career.ru`) и использовать его везде:
- `NEXT_PUBLIC_SITE_URL`
- `YANDEX_REDIRECT_URI`
- callback URL в кабинете Яндекса

Иначе можно получить split-domain (`www`/без `www`) и потерю auth-cookie после редиректа.

## Миграции

Из каталога `web/`:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

Либо выполните SQL из `supabase/migrations/` вручную в SQL Editor.

Обязательные миграции для кабинета:
- `web/supabase/migrations/20260422140000_careerlab_accounts.sql`
- `web/supabase/migrations/20260422170000_password_reset_tokens.sql`
- Проверочный SQL: `web/supabase/snippets/check_office_auth_setup.sql`
- RLS follow-up для пользовательских таблиц: `web/supabase/snippets/check_rls_for_user_tables.sql`

RLS-политики для `vacancies`/`articles` нужны для публичного чтения из Supabase клиентом, но не участвуют в server-side логине через таблицу `careerlab_accounts`.

## Скрипты

```bash
npm run dev
npm run build
npm run lint
```

## Восстановление пароля

- Endpoint: `POST /api/auth/forgot-password` — создает одноразовый токен и отправляет письмо через SMTP.
- Endpoint: `POST /api/auth/reset-password` — валидирует токен и обновляет пароль.
- Не забудьте применить миграцию `web/supabase/migrations/20260422170000_password_reset_tokens.sql`.

## Редиректы со старых `.html`

Статические пути настроены в `next.config.ts`. Для `vacancy.html?id=` и `kb-article.html?id=` — редирект в `middleware.ts`.
