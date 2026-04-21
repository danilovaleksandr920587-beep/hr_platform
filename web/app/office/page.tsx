import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { OfficeDashboard } from "@/components/office/OfficeDashboard";
import { createClient } from "@/lib/supabase/server";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";
import "@/styles/office-mockup.css";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false },
};

function displayNameFromUser(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const m = user.user_metadata;
  if (!m) return null;
  const full = m.full_name;
  if (typeof full === "string" && full.trim()) return full.trim();
  const name = m.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return null;
}

export default async function OfficePage() {
  if (!isPublicSupabaseConfigured()) {
    return (
      <>
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
        <SiteFooter />
      </>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/office");
  }

  const email = user.email ?? user.id;
  const displayName = displayNameFromUser(user);

  return (
    <>
      <OfficeDashboard email={email} displayName={displayName} />
      <SiteFooter />
    </>
  );
}
