# Кабинет компании (B2B-контур) - проектный документ

Статус: ПРОЕКТ / не реализовано. Это дизайн-документ будущей фичи,
не описание текущего состояния приложения. После реализации каждой фазы
переносить факты в OVERVIEW/PAGES/API/DATABASE/FEATURES.

## 1. Цель и рамки

Сейчас платформа - витрина: вакансии заливает парсер через service role,
кнопка отклика ведёт на внешний apply_url (hh.ru и т.п.), компаний как
сущности нет. Цель - дать компаниям самостоятельный контур:

- регистрация компании и команда с ролями (владелец назначает роли)
- публикация и управление вакансиями без участия владельца платформы
- приём откликов прямо на платформе (кандидат откликается со своим
  профилем/резюме, компания видит воронку откликов)
- уведомления обеим сторонам: email + встроенные (колокольчик)

Не входит в рамки (осознанно, на потом): чат кандидат-компания, платные
тарифы/биллинг, поиск по базе резюме кандидатов, ATS-интеграции, API для
компаний.

## 2. Персоны и сценарии

### Персоны

- **HR/рекрутер** - ежедневная работа: постит вакансии, разбирает отклики
- **Владелец/админ компании** - завёл компанию, приглашает команду, отвечает
  за карточку компании
- **Кандидат** (существующая персона) - откликается, следит за статусом
- **Владелец платформы** - модерирует компании и вакансии, следит за
  качеством контента (это SEO-ядро, мусор в выдаче недопустим)

### Сценарий A. Регистрация компании

1. HR попадает на лендинг `/for-companies` (из шапки "Для компаний" / SEO)
2. Регистрируется как обычный аккаунт (email или Яндекс) - механика auth
   не дублируется, тот же `careerlab_accounts`
3. Создаёт компанию: название, сайт, описание, логотип, ИНН (опционально,
   для верификации)
4. Компания попадает в статус `pending` - владелец платформы получает
   уведомление и проверяет (анти-скам: фейковые "вакансии" - типичный
   вектор мошенничества против джунов, целевой аудитории сайта)
5. После верификации - компания `verified`, вакансии могут публиковаться

Ошибки/ветвления: компания с таким ИНН/доменом уже есть -> предложить
запросить доступ у владельца существующей; отклонение верификации ->
письмо с причиной, возможность исправить и переподать.

### Сценарий B. Команда и роли

1. Owner в разделе "Команда" вводит email коллеги и роль
2. Система шлёт письмо-приглашение с токеном (механика как у
   password-reset: token_hash + expires_at)
3. Коллега переходит по ссылке: если аккаунта нет - регистрируется,
   если есть - логинится; членство активируется
4. Owner может менять роли и деактивировать участников
5. Один аккаунт может состоять в нескольких компаниях (переключатель
   активной компании в кабинете)

Матрица ролей:

| Действие | owner | admin | recruiter |
|----------|-------|-------|-----------|
| Профиль компании (ред.) | + | + | - |
| Команда: приглашать, менять роли | + | + (кроме owner) | - |
| Передать владение / удалить компанию | + | - | - |
| Вакансии: создать, редактировать, снять | + | + | + |
| Отклики: просмотр, смена статуса | + | + | + |

Три роли достаточно для MVP. Viewer/аналитик - потом, если попросят.

### Сценарий C. Публикация вакансии

1. Рекрутер жмёт "Новая вакансия" - форма повторяет поля текущей схемы
   `vacancies` (title, description, sphere, exp, format, employment_type,
   salary_min/max, bonus_tags), плюс выбор способа отклика:
   `internal` (на платформе, по умолчанию) или `external` (ссылка)
2. Сохранение в `draft` -> предпросмотр как публичная страница
3. "Отправить на публикацию" -> статус `pending_review`
4. Модерация владельцем платформы: approve -> `published` (ISR подхватит
   за ~5 мин, как сейчас), reject -> `rejected` с причиной
5. Для `verified`-компаний с N успешных публикаций - автопубликация без
   премодерации (пост-модерация выборочно), чтобы не стать бутылочным
   горлышком
6. Рекрутер может снять вакансию (`archived`) или отредактировать
   (существенная правка published-вакансии возвращает на `pending_review`,
   косметическая - нет; граница: title/description/salary - существенные)

### Сценарий D. Отклик кандидата (изменение текущего юзкейса №1)

1. Кандидат на странице вакансии жмёт "Откликнуться"
2. Не залогинен -> `/login?next=...` (отклик - новый магнит регистрации
   в дополнение к анализатору резюме)
3. Форма отклика: резюме (загрузка PDF/DOCX или выбор из уже загруженных),
   сопроводительное (опционально, с подсказкой-ссылкой на статью кластера
   "Отклики"), телефон/telegram (опционально)
4. Отправка -> статус `new`, компания получает уведомление
5. Кандидат видит свои отклики в `/office/applications`: статус
   (отправлен / просмотрен / приглашение / отказ), может отозвать
6. Повторный отклик на ту же вакансию - запрещён (unique-констрейнт)

Для вакансий с `apply_mode = external` (все текущие, из парсера) поведение
не меняется - кнопка ведёт наружу. Обе механики живут параллельно.

### Сценарий E. Работа с откликами (компания)

1. Рекрутер открывает вакансию -> список откликов со статусами:
   `new` / `viewed` / `invited` / `rejected` (+ `withdrawn` со стороны
   кандидата)
2. Открытие карточки отклика: профиль кандидата (то, чем он поделился),
   резюме (просмотр/скачивание), сопроводительное
3. Смена статуса -> кандидат получает уведомление (invited - с контактом
   или текстом от рекрутера; rejected - нейтральный шаблон, текст отказа
   опционален)
4. Фильтры: по вакансии, по статусу, свежие сверху
5. Автоотказ по snooze не делаем; но напоминание рекрутеру про отклики
   в `new` старше 7 дней - да (гигиена: джуны страдают от игнора,
   отзывчивость компаний - репутация платформы)

### Сценарий F. Уведомления

Два канала: in-app (колокольчик, таблица `notifications`) + email (SMTP
уже есть). У пользователя настройка: email-уведомления вкл/выкл по типам.

| Событие | Кому | Каналы |
|---------|------|--------|
| Новый отклик | всем активным членам компании | in-app + email (дайджест, см. ниже) |
| Смена статуса отклика | кандидату | in-app + email |
| Вакансия одобрена/отклонена | автору + owner | in-app + email |
| Приглашение в команду | приглашённому | email (токен) |
| Компания верифицирована/отклонена | owner | in-app + email |
| Отклики висят в `new` > 7 дней | членам компании | email |
| Новая компания/вакансия на модерацию | владельцу платформы | email |

Email про новые отклики - не по одному письму на отклик, а дайджестом
(мгновенно для первого, дальше не чаще раза в час) - иначе при всплеске
откликов на джуновскую вакансию завалим почту.

## 3. Модель данных

Все новые таблицы - в "пользовательском" Postgres (прямой доступ,
`lib/db/postgres.ts`), как auth и кабинет. И с миграциями (это шанс уйти
от ручного состояния схемы - завести `migrations/` и для существующих
пользовательских таблиц).

```sql
-- Компании
CREATE TABLE companies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  name          text NOT NULL,
  inn           text UNIQUE,          -- опционально, для верификации
  website       text,
  logo_url      text,
  description   text,
  status        text NOT NULL DEFAULT 'pending',
    -- pending | verified | rejected | blocked
  status_reason text,
  trusted       boolean NOT NULL DEFAULT false,  -- автопубликация без премодерации
  created_by    bigint REFERENCES careerlab_accounts(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Членство (роль аккаунта в компании)
CREATE TABLE company_members (
  company_id  uuid   REFERENCES companies(id) ON DELETE CASCADE,
  account_id  bigint REFERENCES careerlab_accounts(id) ON DELETE CASCADE,
  role        text   NOT NULL,   -- owner | admin | recruiter
  status      text   NOT NULL DEFAULT 'active',  -- active | disabled
  invited_by  bigint,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, account_id)
);

-- Приглашения (механика как careerlab_password_resets)
CREATE TABLE company_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid REFERENCES companies(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL,
  token_hash  text NOT NULL,
  invited_by  bigint,
  expires_at  timestamptz NOT NULL,
  accepted_at timestamptz,
  UNIQUE (company_id, email)
);

-- Отклики
CREATE TABLE applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_slug text   NOT NULL,          -- связь с vacancies (Supabase, см. ниже)
  company_id   uuid   REFERENCES companies(id),
  account_id   bigint REFERENCES careerlab_accounts(id),
  resume_file  text,                     -- путь в хранилище
  cover_letter text,
  contact      text,
  status       text NOT NULL DEFAULT 'new',
    -- new | viewed | invited | rejected | withdrawn
  status_note  text,                     -- текст приглашения/отказа
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vacancy_slug, account_id)      -- один отклик на вакансию
);

-- Уведомления (in-app)
CREATE TABLE notifications (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id   bigint NOT NULL REFERENCES careerlab_accounts(id),
  type         text   NOT NULL,   -- application_new, application_status, ...
  payload      jsonb  NOT NULL DEFAULT '{}',
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON notifications (account_id, read_at, created_at DESC);

-- Настройки email-уведомлений
CREATE TABLE notification_prefs (
  account_id bigint PRIMARY KEY REFERENCES careerlab_accounts(id),
  email_prefs jsonb NOT NULL DEFAULT '{}'   -- {"application_new": true, ...}
);
```

### Изменения `vacancies` (Supabase, контентная таблица)

Вакансии остаются в Supabase - это контент и SEO, менять место жительства
дорого. Добавить колонки (миграция в `supabase/migrations/`):

```sql
ALTER TABLE vacancies
  ADD COLUMN source      text NOT NULL DEFAULT 'parser',  -- parser | company
  ADD COLUMN company_id  uuid,           -- логическая ссылка на companies
  ADD COLUMN status      text NOT NULL DEFAULT 'published',
    -- draft | pending_review | published | rejected | archived
  ADD COLUMN apply_mode  text NOT NULL DEFAULT 'external', -- external | internal
  ADD COLUMN apply_url   text;           -- если уже есть - пропустить
```

RLS уже фильтрует `is_published = true`; держать инвариант
`is_published = (status = 'published')` при каждой смене статуса. Записи
от имени компаний идут через service role из API-роутов (как сейчас пишет
пайплайн) - публичный anon-ключ по-прежнему только читает.

Кросс-БД связь (applications в Postgres, vacancies в Supabase) - это тот же
физический Postgres, но разные схемы доступа; FK между ними не заводим,
целостность держим на уровне приложения (как уже сделано с
`user_saved_vacancies.slug`).

### Файлы резюме

Хранить вне git и вне public: каталог на VPS (`/var/lib/careerlab/resumes/`
или Supabase Storage, если поднят). Отдача - только через API-роут с
проверкой прав (кандидат-владелец или член компании-получателя). Лимиты:
PDF/DOCX, до 5 МБ - парсер-валидация уже есть в `/api/parse-resume`.
ПД: упомянуть передачу резюме компании в согласии (152-ФЗ, страница
`/consent`), удалять файл при отзыве отклика и по запросу.

## 4. API (эскиз)

Все компанейские роуты требуют session-cookie + членства в компании
с достаточной ролью. Новый хелпер `lib/auth/company-guard.ts`:
`requireCompanyRole(companyId, minRole)`.

```
Компании
POST   /api/companies                      создать компанию (любой залогиненный)
GET    /api/companies/mine                 мои компании + роли
GET    /api/company/[id]                   профиль (member)
PATCH  /api/company/[id]                   редактирование (admin+)

Команда
GET    /api/company/[id]/members           список (member)
POST   /api/company/[id]/invites           пригласить (admin+)
POST   /api/company-invites/accept         принять по токену
PATCH  /api/company/[id]/members/[acc]     роль/деактивация (admin+, owner-правки только owner)

Вакансии компании
GET    /api/company/[id]/vacancies         список со статусами (member)
POST   /api/company/[id]/vacancies         создать draft (recruiter+)
PATCH  /api/company/[id]/vacancies/[slug]  редактировать / сменить статус (recruiter+)

Отклики
POST   /api/vacancies/[slug]/apply         отклик кандидата (auth)
GET    /api/office/applications            отклики кандидата (auth)
DELETE /api/office/applications/[id]       отозвать (auth, владелец)
GET    /api/company/[id]/applications      отклики компании, фильтры (member)
PATCH  /api/company/[id]/applications/[id] смена статуса + note (recruiter+)
GET    /api/applications/[id]/resume       файл резюме (кандидат или member)

Уведомления
GET    /api/notifications                  список + счётчик непрочитанных (auth)
POST   /api/notifications/read             отметить прочитанными (auth)
GET/POST /api/notification-prefs           настройки email (auth)

Модерация (владелец платформы)
GET    /api/admin/moderation               очередь: компании + вакансии
POST   /api/admin/companies/[id]/verify    approve/reject (+trusted)
POST   /api/admin/vacancies/[slug]/review  approve/reject
```

Роль владельца платформы: флаг `is_platform_admin` в `careerlab_accounts`
(или whitelist email в env для MVP).

## 5. Страницы

```
/for-companies                 лендинг "Для компаний" (публичный, SEO)
/company                       кабинет: дашборд (вакансии, новые отклики, статус компании)
/company/new                   создание компании
/company/vacancies             список вакансий + статусы
/company/vacancies/new         форма вакансии
/company/vacancies/[slug]      редактирование + отклики по вакансии
/company/applications          все отклики компании (фильтры)
/company/team                  команда, приглашения, роли
/company/settings              профиль компании, верификация
/company-invite                принятие приглашения по токену
/office/applications           отклики кандидата (в существующем кабинете)
/admin/moderation              очередь модерации (владелец платформы)
```

Guard в `middleware.ts` по образцу `/office*`: `/company*` и `/admin*`
требуют сессию; проверка членства/роли - в layout + API (в middleware
только наличие сессии, без похода в БД - как сейчас).

Публичная страница вакансии для `apply_mode = internal` меняет кнопку
"Откликнуться на hh.ru" на форму отклика. Опционально: публичная карточка
компании `/companies/[slug]` со списком её вакансий - хорошо для SEO,
можно во 2-й фазе.

## 6. Уведомления - реализация

- **In-app**: запись в `notifications` в той же транзакции, что и событие.
  Колокольчик в шапке: поллинг `GET /api/notifications` раз в 60 сек на
  страницах кабинетов (без websocket - не тот масштаб)
- **Email**: nodemailer уже есть. Отправка не блокирует запрос: таблица
  `email_outbox` (to, template, payload, scheduled_at, sent_at) +
  обработчик по cron (pm2/crontab на VPS, там же дайджест-логика
  "не чаще раза в час"). Для MVP допустимо слать синхронно fire-and-forget,
  outbox - как только появится дайджест
- Шаблоны: новый отклик, смена статуса, приглашение, итог модерации,
  напоминание о невскрытых откликах

## 7. Безопасность и качество

- **Анти-скам** - главный риск: аудитория - джуны, любимая цель фейковых
  "работодателей". Поэтому: премодерация первых вакансий каждой компании,
  верификация компании до первой публикации, запрет контактов/ссылок
  в описании вакансии на сторонние мессенджеры до верификации, жалоба
  "пожаловаться на вакансию" на публичной странице
- **Доступ к резюме** - только через API с проверкой прав, файлы вне public
- **Rate-limit** на отклики (N в сутки на кандидата, `lib/rate-limit.ts`
  уже есть) и на создание вакансий/приглашений
- **ПД (152-ФЗ)**: обновить `/consent` и `/privacy-policy` - передача
  резюме и контактов компании-работодателю при отклике; удаление по
  запросу; хранение откликов N месяцев после закрытия вакансии
- **SEO-гигиена**: company-вакансии проходят те же требования к качеству
  описаний; `rejected/archived` не попадают в sitemap (инвариант
  `is_published`); слаги вакансий генерятся как сейчас, без конфликтов

## 8. Фазы

**Фаза 1 - MVP (компания может выложить вакансию и получить отклики): СДЕЛАНО
и на проде.** Компании + членство (owner/recruiter через инвайты), CRUD
вакансий с премодерацией, отклик кандидата с резюме, список откликов со сменой
статуса, email-уведомления (синхронно), страница модерации, лендинг
`/for-companies`, обновление consent, trusted-автопубликация,
`/office/applications` у кандидата с деталями.

**Фаза 2 - роли и уведомления: СДЕЛАНО (кроме email-дайджеста).** Роль admin +
матрица прав (owner > admin > recruiter), in-app колокольчик
(`NotificationBell` + таблица notifications), notification_prefs (API),
переключатель активной компании.
ОТЛОЖЕНО (требует настроенного SMTP + cron на VPS, сейчас SMTP не настроен):
email-outbox с дайджестом «не чаще раза в час», напоминания про отклики в
`new` старше 7 дней, enforcement notification_prefs при отправке писем.

**Фаза 3 - рост:** публичные страницы компаний `/companies` и `/companies/[slug]`
(SEO) - СДЕЛАНО; статистика вакансии (просмотры/клики «Откликнуться») в дашборде
и списке - СДЕЛАНО (`vacancy_stats`). ОТЛОЖЕНО: шаблоны ответов рекрутера, поиск
по откликам, передача владения компанией.

**Монетизация - размещения (СДЕЛАНО, см. MONETIZATION.md):** платные закрепления
вакансий (`is_featured` + `featured_until` со сроком, авто-снятие без cron),
премиум-карточка с бейджем «Партнёр» и полоса «Закреплённые вакансии» на
`/vacancies` (до 3), лендинг `/for-companies` с пакетами, админ-управление
закреплениями в `/admin/moderation`, каталог/профили компаний, нативная полоса
партнёров на главной и в разборе резюме.

## 9. Открытые вопросы (решить до реализации)

1. Верификация компаний: ручная по ИНН (владелец смотрит в ЕГРЮЛ) или
   подтверждение корпоративного email-домена? Для MVP - ручная.
2. Хранилище резюме: каталог на VPS или Supabase Storage? Зависит от того,
   поднят ли Storage в self-hosted Supabase.
3. Нужна ли компания-песочница для демо (аналог `/office-demo`)?
4. Монетизация (лимит бесплатных вакансий?) - влияет на схему, лучше
   решить концептуально до Фазы 1, даже если биллинг не строим.
