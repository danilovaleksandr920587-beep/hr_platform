# Страницы сайта

Все страницы - в `app/`, файл `page.tsx`. Данные читаются на сервере через
`lib/data/*` (Supabase) или через API-роуты (личный кабинет).

## Публичные страницы

| URL | Файл | Что это |
|-----|------|---------|
| `/` | `app/page.tsx` | Главная: hero, избранные вакансии, статьи, CTA |
| `/vacancies` | `app/vacancies/page.tsx` | Каталог вакансий: фильтры (сфера, опыт, формат, тип), полнотекстовый поиск |
| `/vacancies/[slug]` | `app/vacancies/[slug]/page.tsx` | Страница вакансии, SSG по slug |
| `/knowledge-base` | `app/knowledge-base/page.tsx` | База знаний: сетка статей, фильтры по категории и уровню |
| `/knowledge-base/[slug]` | `app/knowledge-base/[slug]/page.tsx` | Статья, SSG по slug |
| `/knowledge-base/resume` | `app/knowledge-base/resume/page.tsx` | Хаб-категория "Резюме" |
| `/knowledge-base/interview` | `app/knowledge-base/interview/page.tsx` | Хаб-категория "Собеседование" |
| `/knowledge-base/test` | `app/knowledge-base/test/page.tsx` | Хаб-категория "Тестовые" |
| `/knowledge-base/salary` | `app/knowledge-base/salary/page.tsx` | Хаб-категория "Зарплата" |
| `/knowledge-base/apply` | `app/knowledge-base/apply/page.tsx` | Хаб-категория "Отклики" |
| `/knowledge-base/career` | `app/knowledge-base/career/page.tsx` | Хаб-категория "Карьера и рост" |
| `/tools/resume-analyzer` | `app/tools/resume-analyzer/page.tsx` | AI-анализатор резюме (YandexGPT) |
| `/tools/salary-calculator` | `app/tools/salary-calculator/page.tsx` | Калькулятор зарплат |
| `/research` | `app/research/page.tsx` | Дашборд исследований зарплат (chart.js) |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | Политика конфиденциальности |
| `/consent` | `app/consent/page.tsx` | Согласие на обработку ПД (152-ФЗ), вкл. передачу резюме работодателю |
| `/for-companies` | `app/for-companies/page.tsx` | Лендинг "Для компаний": как разместить вакансию |

Хабы-категории описаны в `lib/knowledge-clusters.ts` (6 кластеров с приоритетами).

## Авторизация и кабинет

| URL | Файл | Что это |
|-----|------|---------|
| `/login` | `app/login/page.tsx` | Вход + регистрация (email или Яндекс) |
| `/forgot-password` | `app/forgot-password/page.tsx` | Запрос ссылки восстановления |
| `/reset-password` | `app/reset-password/page.tsx` | Установка нового пароля по токену |
| `/office` | `app/office/page.tsx` | Личный кабинет: профиль, чек-лист, прогресс. Закрыт guard-ом |
| `/office/saved-vacancies` | `app/office/saved-vacancies/page.tsx` | Сохранённые вакансии. Закрыт guard-ом |
| `/office/applications` | `app/office/applications/page.tsx` | Отклики кандидата: статусы, отзыв. Закрыт guard-ом |
| `/office/account` | `app/office/account/page.tsx` | Настройки аккаунта: статус email, смена email, ссылка на смену пароля. Закрыт guard-ом |
| `/office-demo` | `app/office-demo/page.tsx` | Демо кабинета без входа, noindex |
| `/vacancies/[slug]/apply` | `app/vacancies/[slug]/apply/page.tsx` | Форма отклика (только apply_mode=internal), сама редиректит на /login |

Guard: `middleware.ts` -> `lib/auth/office-guard.ts` - без session-cookie
редиректит `/office*`, `/company*`, `/company-invite`, `/admin*` на `/login?next=...`
(next сохраняет query string). Роль/членство проверяются на страницах и в API.

Колокольчик уведомлений - в шапке (`components/company/NotificationBell.tsx`),
показывается только залогиненным (сам определяет по 401), поллинг 60с.

## Кабинет компании (B2B, все noindex, закрыты guard-ом)

| URL | Файл | Что это |
|-----|------|---------|
| `/company` | `app/company/page.tsx` | Дашборд: статус компании, счётчики вакансий и откликов |
| `/company/new` | `app/company/new/page.tsx` | Регистрация компании (name, ИНН, сайт, описание) |
| `/company/vacancies` | `app/company/vacancies/page.tsx` | Вакансии компании со статусами |
| `/company/vacancies/new` | `app/company/vacancies/new/page.tsx` | Форма новой вакансии (черновик) |
| `/company/vacancies/[slug]` | `app/company/vacancies/[slug]/page.tsx` | Редактирование, статусы, отклики по вакансии |
| `/company/applications` | `app/company/applications/page.tsx` | Все отклики: фильтры, смена статуса |
| `/company/team` | `app/company/team/page.tsx` | Команда: участники, роли, приглашения |
| `/company/settings` | `app/company/settings/page.tsx` | Профиль компании (только owner) |
| `/company-invite` | `app/company-invite/page.tsx` | Принятие приглашения по токену (?token=) |
| `/admin/moderation` | `app/admin/moderation/page.tsx` | Очередь модерации (только PLATFORM_ADMIN_EMAILS) |

Активная компания: первая из членств аккаунта (`lib/company/active-company.ts`),
переключатель нескольких компаний - фаза 2. Дизайн: `docs/company-portal-design.md`.

## Служебные роуты (не страницы)

| URL | Файл | Что это |
|-----|------|---------|
| `/auth/callback` | `app/auth/callback/route.ts` | Callback Яндекс OAuth |
| `/sitemap.xml` | `app/sitemap.xml/route.ts` | Sitemap-индекс |
| `/sitemap/[...slug]` | `app/sitemap/[...slug]/route.ts` | Секции sitemap (страницы, вакансии, статьи) |
| `/llms.txt` | `app/llms.txt/route.ts` | Список статей для LLM-краулеров, revalidate 1ч |

## Middleware (`middleware.ts`)

1. `www.lab-career.ru` -> `lab-career.ru` (308)
2. Legacy-редиректы: `/vacancy.html?slug=X` -> `/vacancies/X`, `/kb-article.html?id=X` -> `/knowledge-base/X` (308)
3. Guard личного кабинета (`/office*`)
