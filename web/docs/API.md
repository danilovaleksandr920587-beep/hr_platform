# API-роуты

Все в `app/api/`. "Auth" = требуется session-cookie (JWT, `lib/auth/session.ts`).

## Аутентификация (`/api/auth/*`)

| Endpoint | Метод | Что делает |
|----------|-------|------------|
| `/api/auth/register` | POST | Регистрация email+пароль, пишет в `careerlab_accounts` |
| `/api/auth/login` | POST | Вход, ставит session-cookie (30 дней) |
| `/api/auth/logout` | POST | Сброс cookie |
| `/api/auth/forgot-password` | POST | Генерирует токен в `careerlab_password_resets`, шлёт письмо по SMTP |
| `/api/auth/reset-password` | POST | Смена пароля по токену |
| `/api/auth/yandex` | GET | Редирект на Яндекс OAuth (callback: `/auth/callback`) |

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
| `/api/analyze-resume` | POST | Отправляет текст резюме в YandexGPT, возвращает балл и рекомендации. Rate-limit НЕ подключён (баг B-6, см. docs/USECASE_REVIEW.md; `lib/rate-limit.ts` существует, но не используется) |

## Данные для клиентских компонентов

| Endpoint | Метод | Что делает |
|----------|-------|------------|
| `/api/vacancies/featured` | GET | Избранные вакансии для главной |
| `/api/vacancies/by-slugs` | POST | Карточки вакансий по списку slug (для сохранёнок) |
| `/api/articles/by-slugs` | POST | Карточки статей по списку slug |
