-- ============================================
-- МИГРАЦИЯ: Архивирование неактивных вакансий
-- lab-career.ru | 26 вакансий
-- ============================================

-- Шаг 1: Добавить поле is_archived в таблицу vacancies
ALTER TABLE vacancies 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Шаг 2: Пометить неактивные вакансии как архивные
-- (is_published остаётся TRUE — страницы живут для SEO)
UPDATE vacancies
SET 
  is_archived = TRUE,
  updated_at = NOW()
WHERE slug IN (
  'stajer-v-departament-prodaj-i-razvitia-malogo-i-mikrobiznesa-alefa-bank',
  'stajer-v-otdel-kontrola-konteksta-i-monitoringa-alefa-bank',
  'stajer-finansist-v-otdel-soprovojdenia-klientov-faktoringa-srednego-biznesa-alef',
  'stajer-po-operacionno-servisnoj-podderjke-alefa-bank-2',
  'stajer-analitik-bankovskih-processov-alefa-bank',
  'stajer-biznes-analitik-v-direkciu-razvitia-operacionnyh-i-crm-resenij-alefa-bank',
  'stajer-proektnyj-menedjer-v-upravlenie-seteu-alefa-bank',
  'stajer-v-otdel-podbora-personala-alefa-bank',
  'stajer-po-operacionno-servisnoj-podderjke-v-departament-oflajn-prodaj-alefa-bank',
  'stajer-produktovyj-menedjer-v-departament-loalenosti-i-novogo-biznesa-alefa-bank',
  'stajer-analitik-crm-v-departament-sohranenia-onbordinga-i-razvitia-roznicnyh-kli',
  'stajer-po-operacionno-servisnoj-podderjke-alefa-bank-3',
  'stajer-otdela-prognozirovania-sprosa-mars',
  'stajer-otdela-marketinga-mars',
  'stajer-otdela-prodaj-mars',
  'stajer-otdela-issledovania-i-razrabotok-otdel-kacestva-mars',
  'stajer-biznes-analitik-v-departament-upravlenia-dannymi-alefa-bank',
  'stajer-v-upravlenie-po-prodajam-i-razvitiu-mikrobiznesa-alefa-bank',
  'stajer-hr-analitik-alefa-bank',
  'stajer-v-otdel-regulirovania-trudovyh-otnosenij-alefa-bank',
  'stajer-dizajner-v-departament-investicionnogo-obslujivania-sostoatelenyh-kliento',
  'stajer-po-operacionno-servisnoj-podderjke-alefa-bank',
  'stajer-v-direkciu-processov-i-analitiki-alefa-bank',
  'stajer-v-otdel-krupnogo-i-srednego-biznesa-sber',
  'uriskonsulet-stajer-v-uridiceskij-departament-andeksa-andeks',
  'stajer-v-direkcia-po-razrabotke-modelej-uridiceskih-lic-alefa-bank'
);

-- Шаг 3: Проверка результата
SELECT 
  company,
  COUNT(*) FILTER (WHERE is_archived = FALSE) AS active,
  COUNT(*) FILTER (WHERE is_archived = TRUE)  AS archived
FROM vacancies
WHERE is_published = TRUE
GROUP BY company
ORDER BY company;
