import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { OfficeDashboard } from "@/components/office/OfficeDashboard";
import { isPasswordAuthConfigured } from "@/lib/auth/config";
import { getSessionFromCookies } from "@/lib/auth/session";
import "@/styles/office-mockup.css";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false },
};

export default async function OfficePage() {
  if (!isPasswordAuthConfigured()) {
    return (
      <>
        <main className="section">
          <div className="container" style={{ maxWidth: 640 }}>
            <div className="panel">
              <h1 className="page-title">Кабинет</h1>
              <p className="hero-text">
                Вход по email и паролю: задайте в окружении{" "}
                <code>DATABASE_URL</code> (Postgres, тот же что у Supabase/Beget) и{" "}
                <code>AUTH_SECRET</code> — случайная строка не короче 32 символов для подписи
                сессии. Примените миграцию с таблицей <code>careerlab_accounts</code>.
              </p>
              <p className="hero-text">
                <Link className="text-link" href="/">
                  На главную
                </Link>
              </p>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login?next=/office");
  }

  return (
    <>
      <OfficeDashboard
        userScope={session.id}
        email={session.email}
        displayName={session.displayName}
      />
      <SiteFooter />
    </>
  );
}
