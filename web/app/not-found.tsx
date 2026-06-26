import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = {
  title: "Страница не найдена — CareerLab",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontFamily: "var(--font-unbounded), Unbounded, sans-serif", fontSize: "clamp(64px, 12vw, 120px)", fontWeight: 900, color: "var(--lime)", lineHeight: 1 }}>
            404
          </div>
          <h1 style={{ fontFamily: "var(--font-unbounded), Unbounded, sans-serif", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, margin: "16px 0 12px", color: "var(--dark)" }}>
            Страница не найдена
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 16, marginBottom: 32, maxWidth: 380, marginInline: "auto" }}>
            Возможно, адрес изменился или такой страницы никогда не существовало.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{ display: "inline-block", background: "var(--lime)", color: "var(--dark)", fontWeight: 600, padding: "12px 24px", borderRadius: 10, textDecoration: "none", fontSize: 15 }}>
              На главную
            </Link>
            <Link href="/vacancies" style={{ display: "inline-block", border: "1.5px solid var(--border)", color: "var(--dark)", fontWeight: 600, padding: "12px 24px", borderRadius: 10, textDecoration: "none", fontSize: 15 }}>
              Вакансии
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
