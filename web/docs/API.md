# API-роуты

Все в `app/api/`. "Auth" = требуется session-cookie (JWT, `lib/auth/session.ts`).

## Аутентификация (`/api/auth/*`)

| Endpoint | Метод | Что делает |
|----------|-------|------------|
| `/api/auth/register` | POST | Регистрация email+пароль, пишет в `careerlab_accounts`. Rate-limit 5/час по IP |
| `/api/auth/login` | POST | Вход, ставит session-cookie (30 дней). Rate-limit 10/15мин по IP (антибрутфорс) |
| `/api/auth/logout` | POST | Сброс cookie |
| `/api/auth/forgot-password` | POST | Генерирует токен в `careerlab_password_resets`, шлёт письмо по SMTP. Origin ссылки - через x-forwarded-* |
| `/api/auth/reset-password` | POST | Смена пароля по токену |
| `/api/auth/yandex` | GET | Редирект на Яндекс OAuth (callback: `/auth/callback`). Ставит nonce-cookie для anti-CSRF, сверяется в callback |

## Личный кабинет (все - Auth)

| Endpoint | Методы | Что делает |
|----------|--------|------------|
| `/api/profile` | GET, POST | Профиль пользователя (`user_profiles`) |
| `/api/checklist` | GET, POST | Прогресс карьерного чек-листа (`user_checklist_progress`) |
| `/api/saved-vacancies` | GET, POST, DELETE | Сохранённые вакансии (`user_saved_vacancies`) |
| `/api/saved-articles` | GET, POST, DELETE | Сохранённые статьи (`user_saved_articles`) |
| `/api/resume-analysis` | GET, POST | История анализов резюме (`user_resume_analyses`) |

## Инструменты

| Endpoint | Метод | Что делает |
|----------|-------|------------|
| `/api/parse-resume` | POST | Извлекает текст из загруженного PDF/DOCX (pdf-parse, mammoth) |
| `/api/analyze-resume` | POST | Отправляет текст резюме в YandexGPT, возвращает балл и рекомендации. Rate-limit: 10/час по IP (`lib/rate-limit.ts`) |

## Данные для клиентских компонентов

| Endpoint | Метод | Что делает |
|----------|-------|------------|
| `/api/vacancies/featured` | GET | Избранные вакансии для главной |
| `/api/vacancies/by-slugs` | POST | Карточки вакансий по списку slug (для сохранёнок) |
| `/api/articles/by-slugs` | POST | Карточки статей по списку slug |

## B2B: компании и команда (Auth; роль проверяет `lib/company/guard.ts`)

| Endpoint | Методы | Роль | Что делает |
|----------|--------|------|------------|
| `/api/companies` | POST | auth | Создать компанию (status=pending), owner-членство, письмо админам |
| `/api/companies/mine` | GET | auth | Мои компании и роли |
| `/api/company/[id]` | GET, PATCH | member / owner | Профиль компании |
| `/api/company/[id]/members` | GET | member | Участники + непринятые инвайты |
| `/api/company/[id]/members/[accountId]` | PATCH | owner | Роль/деактивация (нельзя убрать последнего owner) |
| `/api/company/[id]/invites` | POST | owner | Приглашение по email (токен 7 дней). Возвращает `inviteUrl` + `emailSent`; письмо только если SMTP настроен, иначе ссылку передают вручную |
| `/api/company-invites/accept` | POST | auth | Принять инвайт по токену (email должен совпасть) |

## B2B: вакансии компании (записи в Supabase через service role)

| Endpoint | Методы | Роль | Что делает |
|----------|--------|------|------------|
| `/api/company/[id]/vacancies` | GET, POST | member | Список со статусами / создать draft |
| `/api/company/[id]/vacancies/[slug]` | GET, PATCH | member | Редактирование; `{action: submit\|archive\|unarchive}` - смена статуса |

Статусы: draft -> pending_review -> published/rejected; published -> archived.
`submit` требует company.status=verified; для trusted-компаний - сразу published.
Правка published-вакансии не-trusted компанией возвращает её на модерацию.

## B2B: отклики

| Endpoint | Методы | Кто | Что делает |
|----------|--------|-----|------------|
| `/api/vacancies/[slug]/apply` | POST | auth | Отклик: multipart (resume PDF/DOCX до 5МБ, coverLetter, contact). Rate-limit 10/сутки. Письмо команде компании |
| `/api/office/applications` | GET | auth | Отклики кандидата |
| `/api/office/applications/[id]` | DELETE | auth | Отозвать отклик (файл резюме удаляется) |
| `/api/company/[id]/applications` | GET | member | Отклики компании, фильтры ?vacancy=&status= |
| `/api/company/[id]/applications/[applicationId]` | PATCH | member | Статус viewed/invited/rejected (+note). Письмо кандидату |
| `/api/applications/[id]/resume` | GET | кандидат/member/админ | Файл резюме (хранится вне public, см. RESUME_STORAGE_DIR) |

## B2B: модерация (PLATFORM_ADMIN_EMAILS)

| Endpoint | Методы | Что делает |
|----------|--------|------------|
| `/api/admin/moderation` | GET | Очередь: компании pending + вакансии pending_review |
| `/api/admin/companies/[id]/verify` | POST | `{approve, reason?, trusted?}` + письмо и in-app владельцам |
| `/api/admin/vacancies/[slug]/review` | POST | `{approve, reason?}` + письмо и in-app команде |

## B2B фаза 2: in-app уведомления (Auth)

| Endpoint | Методы | Что делает |
|----------|--------|------------|
| `/api/notifications` | GET | Список уведомлений + счётчик непрочитанных (401 гостю - колокольчик прячется) |
| `/api/notifications/read` | POST | Отметить прочитанными: `{ids?}` (без тела - все) |
| `/api/notification-prefs` | GET, POST | Настройки email-уведомлений по типам (задел под email-дайджест, enforcement - позже) |

Уведомления пишутся в тех же роутах, что и события (отклик, смена статуса,
модерация), рядом с email. Типы: application_new, application_status,
company_moderation, vacancy_moderation. Колокольчик - в шапке (`NotificationBell`,
поллинг 60с). Роли компании теперь owner/admin/recruiter (admin - команда и
профиль, кроме действий с владельцами).
