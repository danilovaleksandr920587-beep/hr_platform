import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { isPasswordAuthConfigured } from "@/lib/auth/config";
import { optionalString } from "@/lib/searchParams";

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
    <main className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="page-title">Вход</h1>
        <p className="hero-text">
          Войдите или зарегистрируйтесь — после входа откроется{" "}
          <Link href="/office">личный кабинет</Link>.
        </p>
        {err === "auth" ? (
          <p className="hero-text" style={{ color: "var(--coral)" }}>
            Сессия недействительна или истекла. Войдите снова.
          </p>
        ) : null}
        <LoginForm nextPath={nextPath} configured={configured} />
      </div>
    </main>
  );
}
