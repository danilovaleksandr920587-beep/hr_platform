import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/support";

export function SiteFooter() {
  return (
    <footer className="footer section">
      <div className="container footer-wrap">
        <p>© 2026 CareerLab</p>
        <div className="footer-links">
          <Link href="/">О платформе</Link>
          <Link href="/for-companies">Для компаний</Link>
          <Link href="/knowledge-base">Вопросы и ответы</Link>
          <Link href="/research">Как мы считаем данные</Link>
          <Link href="/privacy-policy">Политика конфиденциальности</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>Поддержка: {SUPPORT_EMAIL}</a>
        </div>
      </div>
    </footer>
  );
}
