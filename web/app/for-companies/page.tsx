import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Для компаний - разместить вакансию для джунов и стажёров",
  description:
    "Публикуйте вакансии для стажёров и джунов бесплатно: аудитория студентов и начинающих специалистов, отклики с резюме прямо в кабинете, командный доступ.",
};

const STEPS = [
  {
    title: "Зарегистрируйте компанию",
    text: "Обычный аккаунт + карточка компании. Проверка занимает около 1 рабочего дня - фильтруем фейковых работодателей, чтобы кандидаты доверяли площадке.",
  },
  {
    title: "Опубликуйте вакансию",
    text: "Черновик можно готовить сразу. После проверки компании вакансия уходит на быструю модерацию и появляется в каталоге.",
  },
  {
    title: "Получайте отклики",
    text: "Кандидаты откликаются с резюме и сопроводительным письмом. Вся воронка - в кабинете: новые, просмотренные, приглашённые.",
  },
] as const;

const BENEFITS = [
  {
    title: "Целевая аудитория",
    text: "Студенты и джуны, которые готовятся к откликам: пишут резюме с нашим AI-анализатором и читают базу знаний.",
  },
  {
    title: "Команда с ролями",
    text: "Пригласите коллег: владелец управляет компанией и командой, рекрутеры работают с вакансиями и откликами.",
  },
  {
    title: "Уведомления",
    text: "Письмо о каждом новом отклике и решении модерации - ничего не потеряется.",
  },
] as const;

export default function ForCompaniesPage() {
  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <h1 className="page-title">Нанимайте джунов и стажёров на CareerLab</h1>
          <p className="hero-text" style={{ maxWidth: 640 }}>
            CareerLab - платформа для студентов и начинающих специалистов: вакансии, база знаний
            и инструменты подготовки. Разместите вакансию и получайте отклики с резюме прямо
            в кабинете компании.
          </p>
          <p style={{ margin: "20px 0 36px" }}>
            <Link className="btn-dark" href="/company/new" style={{ textDecoration: "none" }}>
              Разместить вакансию
            </Link>
          </p>

          <h2>Как это работает</h2>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", marginBottom: 36 }}>
            {STEPS.map((s, i) => (
              <div key={s.title} className="panel">
                <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{i + 1}</div>
                <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{s.title}</p>
                <p style={{ margin: 0, fontSize: 14 }}>{s.text}</p>
              </div>
            ))}
          </div>

          <h2>Почему CareerLab</h2>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", marginBottom: 36 }}>
            {BENEFITS.map((b) => (
              <div key={b.title} className="panel">
                <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{b.title}</p>
                <p style={{ margin: 0, fontSize: 14 }}>{b.text}</p>
              </div>
            ))}
          </div>

          <div className="panel" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
            <p style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 600 }}>
              Первая вакансия - за 10 минут
            </p>
            <Link className="btn-dark" href="/company/new" style={{ textDecoration: "none" }}>
              Зарегистрировать компанию
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
