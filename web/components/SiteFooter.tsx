import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="footer section">
      <div className="container footer-wrap">
        <p>CareerLab, 2026</p>
        <div className="footer-links">
          <Link href="/">О платформе</Link>
          <Link href="/knowledge-base">Вопросы и ответы</Link>
          <Link href="/office">Контакты</Link>
          <Link href="/research">Как мы считаем данные</Link>
        </div>
      </div>
    </footer>
  );
}
