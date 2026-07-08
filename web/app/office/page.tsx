import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { OfficeDashboard } from "@/components/office/OfficeDashboard";
import { EmailVerifyBanner } from "@/components/office/EmailVerifyBanner";
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

export default async function OfficePage(props: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const { verify } = await props.searchParams;
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
  // Профиль читаем на сервере целиком и отдаём пропом: убирает клиентский
  // fetch /api/profile из каскада запросов после загрузки страницы.
  let sphere: string | undefined;
  let initialProfile: {
    firstName: string; surname: string; direction: string;
    level: string; format: string; city: string;
  } | null = null;
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT first_name, surname, direction, level, format, city
      FROM user_profiles WHERE account_id = ${session.id} LIMIT 1
    `) as { first_name: string; surname: string; direction: string; level: string; format: string; city: string }[];
    if (rows[0]) {
      const r = rows[0];
      initialProfile = {
        firstName: r.first_name, surname: r.surname, direction: r.direction,
        level: r.level, format: r.format, city: r.city,
      };
      if (r.direction) sphere = DIRECTION_TO_SPHERE[r.direction];
    }
  } catch {}
  const matchedVacancies = await listVacancies({ limit: 4, fields: "card", ...(sphere ? { sphere: [sphere] } : {}) });

  // Статус подтверждения email - для баннера и гейта откликов.
  let emailVerified = true;
  try {
    const sql = getSql();
    const vrows = (await sql`
      SELECT email_verified FROM careerlab_accounts WHERE id = ${session.id} LIMIT 1
    `) as { email_verified: boolean }[];
    emailVerified = Boolean(vrows[0]?.email_verified);
  } catch {}

  const verifiedNote =
    emailVerified && (verify === "ok" || verify === "email_changed")
      ? verify === "email_changed"
        ? "Новый email подтверждён и сохранён."
        : "Email подтверждён. Спасибо!"
      : null;

  return (
    <>
      {(!emailVerified || verifiedNote) && (
        <div className="container" style={{ maxWidth: 960, marginTop: 16 }}>
          {!emailVerified ? (
            <EmailVerifyBanner email={session.email} verifyStatus={verify} />
          ) : (
            <div
              role="status"
              style={{
                margin: "0 0 16px",
                padding: "12px 16px",
                borderRadius: 10,
                background: "#eaf7ea",
                border: "1px solid #9cc79c",
                color: "#245224",
                fontSize: 14,
              }}
            >
              {verifiedNote}
            </div>
          )}
        </div>
      )}
      <OfficeDashboard
        userScope={session.id}
        email={session.email}
        displayName={session.displayName}
        matchedVacancies={matchedVacancies}
        initialProfile={initialProfile}
      />
      <SiteFooter />
    </>
  );
}
