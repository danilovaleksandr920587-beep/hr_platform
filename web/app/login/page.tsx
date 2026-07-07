import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { isPasswordAuthConfigured } from "@/lib/auth/config";
import { optionalString } from "@/lib/searchParams";
import "@/styles/auth.css";

export const metadata: Metadata = {
  title: "Вход",
  description: "Вход и регистрация в личном кабинете CareerLab по email и паролю.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const nextRaw = optionalString(sp, "next");
  const nextPath = nextRaw.startsWith("/") && !nextRaw.startsWith("//")
    ? nextRaw
    : "/office";
  const err = optionalString(sp, "error");
  const configured = isPasswordAuthConfigured();

  return (
    <main className="section auth-section">
      <div className="auth-container">
        {err === "auth" ? (
          <p className="auth-alert">
            Сессия недействительна или истекла. Войдите снова.
          </p>
        ) : null}
        <LoginForm nextPath={nextPath} configured={configured} />
      </div>
    </main>
  );
}
