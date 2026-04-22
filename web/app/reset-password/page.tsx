import type { Metadata } from "next";
import Link from "next/link";
import { optionalString } from "@/lib/searchParams";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Новый пароль",
  description: "Установка нового пароля.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const token = optionalString(sp, "token");

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="page-title">Установить новый пароль</h1>
        {!token ? (
          <div className="panel" style={{ marginTop: "1rem" }}>
            <p className="hero-text">Ссылка недействительна или отсутствует токен восстановления.</p>
            <div className="hero-actions">
              <Link href="/forgot-password" className="btn btn-coral">
                Запросить новую ссылку
              </Link>
              <Link href="/login" className="btn btn-light">
                Ко входу
              </Link>
            </div>
          </div>
        ) : (
          <ResetPasswordForm token={token} />
        )}
      </div>
    </main>
  );
}

