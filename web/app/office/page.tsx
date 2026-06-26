import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { OfficeDashboard } from "@/components/office/OfficeDashboard";
import { isPasswordAuthConfigured } from "@/lib/auth/config";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listVacancies } from "@/lib/data/vacancies";
import { getSql } from "@/lib/db/postgres";
import "@/styles/office-mockup.css";
import "@/styles/resume-analyzer.css";

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

  const DIRECTION_TO_SPHERE: Record<string, string> = {
    IT: "it", Аналитика: "analytics", Финансы: "finance",
    Маркетинг: "marketing", Управление: "product", Дизайн: "design", QA: "it",
  };
  let sphere: string | undefined;
  try {
    const sql = getSql();
    const rows = await sql`SELECT direction FROM user_profiles WHERE account_id = ${session.id} LIMIT 1` as { direction: string }[];
    if (rows[0]?.direction) sphere = DIRECTION_TO_SPHERE[rows[0].direction];
  } catch {}
  const matchedVacancies = await listVacancies({ limit: 4, fields: "card", ...(sphere ? { sphere: [sphere] } : {}) });

  return (
    <>
      <OfficeDashboard
        userScope={session.id}
        email={session.email}
        displayName={session.displayName}
        matchedVacancies={matchedVacancies}
      />
      <SiteFooter />
    </>
  );
}
