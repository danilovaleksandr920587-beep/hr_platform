import Link from "next/link";

const links = [
  { href: "/", label: "Главная" },
  { href: "/vacancies", label: "Вакансии" },
  { href: "/knowledge-base", label: "База знаний" },
  { href: "/research", label: "Исследования" },
  { href: "/office", label: "Личный кабинет" },
] as const;

export function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="topbar">
      <div className="container nav-wrap">
        <Link href="/" className="logo">
          <span className="logo-mark">C</span>
          CareerLab
        </Link>
        <nav className="nav" aria-label="Меню">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={active === href ? "active-link" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link className="btn btn-dark" href="/office">
          В кабинет
        </Link>
      </div>
    </header>
  );
}
