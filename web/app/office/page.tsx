import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false },
};

export default async function OfficePage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.length ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length
  ) {
    return (
      <main className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="panel">
            <h1 className="page-title">Кабинет</h1>
            <p className="hero-text">
              Supabase ещё не подключён: добавьте{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> и{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> в окружение (например,
              в Vercel → Settings → Environment Variables).
            </p>
            <p className="hero-text">
              <Link className="text-link" href="/">
                На главную
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/office");
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <h1 className="page-title">Кабинет</h1>
        <p className="hero-text">
          Вы вошли как <strong>{user.email ?? user.id}</strong>.
        </p>
        <p className="hero-text">
          <Link className="text-link" href="/">
            На главную
          </Link>
        </p>
      </div>
    </main>
  );
}
