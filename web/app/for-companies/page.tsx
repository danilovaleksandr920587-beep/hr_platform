import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { PlacementButton } from "@/components/PlacementRequestForm";

export const metadata: Metadata = {
  title: "Работодателям - размещение вакансий для начинающих специалистов",
  description:
    "Разместите вакансию там, где её ищут начинающие специалисты: закрепление в топе каталога, пост в Telegram-канале и статья о работе у вас, которая остаётся в поиске. Пакеты от 5 000 ₽.",
};

const STATS = [
  { num: "100%", label: "аудитории - студенты и начинающие специалисты в активном поиске" },
  { num: "70+", label: "карьерных гайдов приводят кандидатов из поиска" },
  { num: "3", label: "закреплённых места в каталоге" },
] as const;

const PACKAGES = [
  {
    name: "Размещение",
    price: "5 000 ₽",
    period: "за 30 дней",
    tagline: "Одна вакансия на самом видном месте",
    features: [
      "Закрепление в топе каталога на 30 дней",
      "Логотип и выделенная карточка",
      "Пост о вакансии в Telegram-канале",
      "Статистика: просмотры и переходы",
    ],
    cta: "Оставить заявку",
    dark: false,
  },
  {
    name: "Бутик",
    price: "от 15 000 ₽",
    period: "разово",
    tagline: "Размещение + бренд работодателя",
    features: [
      "До 3 вакансий с закреплением на 30 дней",
      "Страница компании со значком «Проверенный работодатель»",
      "Статья «Как попасть к вам» - навсегда остаётся в поиске",
      "Два поста в Telegram-канале с интервалом в 2 недели",
      "Статистика по каждой вакансии",
    ],
    cta: "Оставить заявку",
    dark: true,
  },
  {
    name: "Сезон",
    price: "от 30 000 ₽",
    period: "за квартал",
    tagline: "Для регулярного найма стажёров",
    features: [
      "Вакансии без ограничений весь квартал",
      "Приоритет в закреплённых местах",
      "Пост в каждом дайджесте канала",
      "Статья + обновление под сезон найма",
    ],
    cta: "Оставить заявку",
    dark: false,
  },
] as const;

const STEPS = [
  {
    title: "Заявка",
    text: "Расскажите, кого ищете. Ответим в течение рабочего дня и согласуем состав размещения.",
  },
  {
    title: "Договор и счёт",
    text: "Работаем официально: договор, счёт и закрывающие документы для бухгалтерии.",
  },
  {
    title: "Запуск",
    text: "Вакансия появляется в топе каталога и в Telegram-канале в течение одного рабочего дня.",
  },
] as const;

const REASONS = [
  {
    title: "Точная аудитория",
    text: "Каждый посетитель - студент или начинающий специалист, который ищет работу прямо сейчас: проверяет резюме AI-анализатором и готовится к собеседованиям по нашей базе знаний.",
  },
  {
    title: "Ваша вакансия на виду",
    text: "На крупных джоб-бордах вакансия для начинающих конкурирует с десятками тысяч других. У нас в закреплении максимум три работодателя - каждая позиция получает внимание.",
  },
  {
    title: "Статья работает годами",
    text: "Материал «Как попасть в вашу компанию» индексируется поисковиками и продолжает приводить кандидатов после окончания размещения. Такого не даёт ни один джоб-борд.",
  },
] as const;

const FAQ = [
  {
    q: "Чем платное размещение отличается от бесплатного?",
    a: "Вакансии и так попадают в каталог через агрегатор - строкой в общем списке. Платный пакет ставит вас над этим списком: закрепление с выделенной карточкой, пост в канале, страница компании и статья. Вы платите не за публикацию, а за то, чтобы вас увидели первыми.",
  },
  {
    q: "Что за статья и кто её пишет?",
    a: "Разбор «Как попасть в компанию X»: форматы стажировок, требования, этапы отбора, советы кандидатам. Пишем мы, вы согласуете факты. Статья живёт в базе знаний и собирает поисковый трафик по запросам с вашим брендом - это актив, который остаётся навсегда.",
  },
  {
    q: "Какая у вас аудитория?",
    a: "Студенты и начинающие специалисты, которые готовятся к первой работе: разработка, аналитика, дизайн, маркетинг, продукт и другие направления. Они приходят из поиска на карьерные гайды, проверяют резюме AI-анализатором и подписаны на наш Telegram-канал.",
  },
  {
    q: "Как я пойму, что размещение работает?",
    a: "В кабинете компании видна статистика по каждой вакансии: просмотры и переходы по кнопке «Откликнуться». Плюс отклики кандидатов с резюме приходят прямо на платформу.",
  },
  {
    q: "Как оплатить?",
    a: "По счёту, с договором и закрывающими документами. Согласуем состав пакета, выставляем счёт - публикуем в течение рабочего дня после оплаты.",
  },
] as const;

/** Статический мок закреплённой карточки - живой пример того, что покупает клиент. */
function PartnerCardDemo() {
  return (
    <div className="pcd-wrap" aria-hidden="true">
      <article className="job-card vacancy-card-modern featured partner pcd-card">
        <span className="partner-corner">Рекомендуем</span>
        <div className="job-card-top">
          <div className="job-card-left">
            <div className="job-company-row">
              <svg
                className="co-logo"
                style={{ width: 46, height: 46, borderRadius: 11, padding: 0 }}
                viewBox="0 0 46 46"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="46" height="46" rx="11" fill="#0d0f08" />
                <circle cx="18" cy="23" r="8" fill="#c9f135" />
                <circle cx="30" cy="23" r="8" fill="#c9f135" fillOpacity="0.45" />
              </svg>
              <div className="job-company-meta">
                <div className="job-company">Ваша компания</div>
                <div className="job-co">Москва · удалённо</div>
              </div>
            </div>
            <h3 className="job-title">Junior-разработчик</h3>
          </div>
          <div className="job-salary-block">
            <div className="job-salary partner-salary">80 000 – 120 000 ₽</div>
          </div>
        </div>
        <p className="job-desc">
          Возьмём начинающего специалиста в команду продукта: реальные задачи,
          код-ревью, наставник…
        </p>
        <ul className="job-tags">
          <li><span className="jtag jtag-format">IT</span></li>
          <li><span className="jtag jtag-exp">Без опыта</span></li>
          <li><span className="jtag jtag-type-intern">Стажировка</span></li>
        </ul>
        <footer className="job-card-bottom">
          <div className="job-actions">
            <span className="job-btn-primary vacancy-card-btn">Откликнуться</span>
            <span className="job-btn-secondary vacancy-card-btn">Подробнее</span>
          </div>
        </footer>
      </article>
    </div>
  );
}

export default function ForCompaniesPage() {
  return (
    <>
      <main>
        <div className="page-header fc-hero">
          <div className="page-header-inner">
            <p className="ph-eyebrow">Для работодателей</p>
            <h1 className="ph-title">Нанимайте там, где ищут первую работу</h1>
            <p className="fc-hero-sub">
              CareerLab - платформа для тех, кто начинает карьеру: вакансии,
              AI-разбор резюме и база знаний. Мы размещаем вакансии вручную,
              поэтому каждая позиция остаётся на виду, а не теряется в выдаче.
            </p>
            <div className="fc-hero-actions">
              <PlacementButton packageName="Бутик" className="fc-btn-dark">
                Оставить заявку
              </PlacementButton>
              <a className="fc-btn-ghost" href="#packages">
                Смотреть пакеты
              </a>
            </div>
          </div>
        </div>

        <div className="fc-stats" aria-label="Аудитория CareerLab">
          {STATS.map((s) => (
            <div key={s.num} className="fc-stat">
              <div className="fc-stat-num">{s.num}</div>
              <div className="fc-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <section className="section">
          <div className="container" style={{ maxWidth: 1040 }}>
            <h2 id="packages" className="fc-sec-title">Пакеты размещения</h2>
            <div className="pricing-grid">
              {PACKAGES.map((p) => (
                <div
                  key={p.name}
                  className={`pricing-card${p.dark ? " pricing-card--dark" : ""}`}
                >
                  {p.dark ? <span className="pricing-tag">Рекомендуем</span> : null}
                  <p className="pricing-name">{p.name}</p>
                  <p className="pricing-price">
                    {p.price} <span className="pricing-period">{p.period}</span>
                  </p>
                  <p className="pricing-tagline">{p.tagline}</p>
                  <ul className="pricing-features">
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <PlacementButton
                    packageName={p.name}
                    className={p.dark ? "fc-btn-lime pricing-cta" : "fc-btn-outline pricing-cta"}
                  >
                    {p.cta}
                  </PlacementButton>
                </div>
              ))}
            </div>
            <p className="pricing-note">
              Состав пакета подстроим под ваш найм. Договор, счёт, закрывающие документы.
            </p>
          </div>
        </section>

        <section className="section fc-demo-section">
          <div className="container fc-demo-grid" style={{ maxWidth: 1040 }}>
            <div className="fc-demo-text">
              <h2 className="fc-sec-title">Так выглядит ваша вакансия</h2>
              <p>
                Закреплённая карточка стоит над общей выдачей - с логотипом,
                зарплатой и выделенным оформлением. Таких мест в каталоге три,
                и одно из них может быть вашим.
              </p>
              <p>
                <Link className="fc-btn-outline" href="/vacancies" target="_blank">
                  Посмотреть каталог вживую
                </Link>
              </p>
            </div>
            <PartnerCardDemo />
          </div>
        </section>

        <section className="section">
          <div className="container" style={{ maxWidth: 1040 }}>
            <h2 className="fc-sec-title">Как это происходит</h2>
            <div className="company-tile-grid">
              {STEPS.map((s, i) => (
                <div key={s.title} className="panel">
                  <div className="company-tile-num">{i + 1}</div>
                  <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{s.title}</p>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{s.text}</p>
                </div>
              ))}
            </div>

            <h2 className="fc-sec-title">Почему это работает</h2>
            <div className="company-tile-grid">
              {REASONS.map((r) => (
                <div key={r.title} className="panel">
                  <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{r.title}</p>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{r.text}</p>
                </div>
              ))}
            </div>

            <h2 className="fc-sec-title">Частые вопросы</h2>
            <div className="faq-list">
              {FAQ.map((f) => (
                <details key={f.q} className="faq-item">
                  <summary className="faq-q">{f.q}</summary>
                  <p className="faq-a">{f.a}</p>
                </details>
              ))}
            </div>

            <div className="fc-final-cta">
              <p className="fc-final-cta-title">
                Обсудим размещение под ваш найм?
              </p>
              <p className="fc-final-cta-sub">
                Напишите нам - ответим в тот же рабочий день и соберём пакет под задачу.
              </p>
              <PlacementButton packageName="Бутик" className="fc-btn-lime">
                Оставить заявку
              </PlacementButton>
            </div>

            <div className="panel" style={{ marginTop: 16, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 14 }}>
                Хотите принимать отклики с резюме прямо на платформе?{" "}
                <Link className="text-link" href="/company/new">
                  Заведите кабинет компании
                </Link>{" "}
                - это бесплатно и не требует пакета.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
