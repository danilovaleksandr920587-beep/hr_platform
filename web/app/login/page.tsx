import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { optionalString } from "@/lib/searchParams";

export const metadata: Metadata = {
  title: "Вход",
  description: "Вход в личный кабинет CareerLab через magic link.",
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
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.length &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
  );

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="page-title">Вход</h1>
        <p className="hero-text">
          Введите email — отправим одноразовую ссылку. После входа откроется{" "}
          <Link href="/office">личный кабинет</Link>.
        </p>
        {err === "auth" ? (
          <p className="hero-text" style={{ color: "var(--coral)" }}>
            Не удалось подтвердить вход. Попробуйте запросить ссылку ещё раз.
          </p>
        ) : null}
        <LoginForm nextPath={nextPath} configured={configured} />
      </div>
    </main>
  );
}
