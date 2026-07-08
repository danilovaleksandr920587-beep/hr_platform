import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { ChangeEmailForm } from "@/components/office/ChangeEmailForm";
import { EmailVerifyBanner } from "@/components/office/EmailVerifyBanner";
import { isPasswordAuthConfigured } from "@/lib/auth/config";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getSql } from "@/lib/db/postgres";
import "@/styles/office-mockup.css";

export const metadata: Metadata = {
  title: "Настройки аккаунта",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  if (!isPasswordAuthConfigured()) redirect("/login");
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/office/account");

  let email = session.email;
  let emailVerified = true;
  let isOAuth = false;
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT email, email_verified, password_hash
      FROM careerlab_accounts WHERE id = ${session.id} LIMIT 1
    `) as { email: string; email_verified: boolean; password_hash: string }[];
    if (rows[0]) {
      email = rows[0].email;
      emailVerified = Boolean(rows[0].email_verified);
      isOAuth = !rows[0].password_hash.startsWith("scl$");
    }
  } catch {}

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <h1 className="page-title">Настройки аккаунта</h1>

          {!emailVerified && <EmailVerifyBanner email={email} />}

          <div className="panel" style={{ marginBottom: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Email</h2>
            <p style={{ fontSize: 15 }}>
              Текущий адрес: <strong>{email}</strong>{" "}
              {emailVerified ? (
                <span style={{ color: "#245224" }}>· подтверждён</span>
              ) : (
                <span style={{ color: "#a15c00" }}>· не подтверждён</span>
              )}
            </p>

            {isOAuth ? (
              <p style={{ fontSize: 14, color: "#666" }}>
                Вход через Яндекс - email управляется в Яндекс ID, сменить его здесь нельзя.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14, color: "#666" }}>
                  На новый адрес придёт письмо для подтверждения. Email сменится только после
                  перехода по ссылке из письма.
                </p>
                <ChangeEmailForm />
              </>
            )}
          </div>

          {!isOAuth && (
            <div className="panel">
              <h2 style={{ marginTop: 0, fontSize: 18 }}>Пароль</h2>
              <p style={{ fontSize: 14, color: "#666" }}>
                Сменить пароль можно через восстановление доступа.
              </p>
              <Link className="text-link" href="/forgot-password">
                Сменить пароль
              </Link>
            </div>
          )}

          <p style={{ marginTop: 20 }}>
            <Link className="text-link" href="/office">
              ← В кабинет
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
