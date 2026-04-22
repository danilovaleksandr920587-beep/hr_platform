# CareerLab (Next.js + Supabase)

Публичные страницы с **SSR/ISR** и данными из Supabase, защита `/office` через `@supabase/ssr` и middleware.

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните значения из [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — обязательны для списков и деталок.
- `NEXT_PUBLIC_SITE_URL` — канонический URL (например `https://your-domain.vercel.app`) для `metadataBase`, sitemap и корректного `emailRedirectTo` при magic link.
- `SUPABASE_SERVICE_ROLE_KEY` — только на сервере; в этом шаблоне UI его не использует.
- `DATABASE_URL`, `AUTH_SECRET` — обязательны для локальной email/password авторизации кабинета.
- SMTP для восстановления пароля (server-only):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - опционально `MAIL_APP_NAME` (по умолчанию `CareerLab`)

В Supabase Auth → URL Configuration добавьте redirect: `https://<ваш-домен>/auth/callback` (и `http://localhost:3000/auth/callback` для разработки).

## Миграции

Из каталога `web/`:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

Либо выполните SQL из `supabase/migrations/` вручную в SQL Editor.

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
