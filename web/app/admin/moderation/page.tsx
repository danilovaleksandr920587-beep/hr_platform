import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { ModerationQueue } from "@/components/admin/ModerationQueue";
import { getSessionFromCookies } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { listPendingCompanies } from "@/lib/company/store";
import { listVacanciesPendingReview } from "@/lib/company/vacancies";

export const metadata: Metadata = {
  title: "Модерация",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/admin/moderation");
  if (!isPlatformAdmin(session.email)) redirect("/");

  const [companies, vacancies] = await Promise.all([
    listPendingCompanies().catch(() => []),
    listVacanciesPendingReview().catch(() => []),
  ]);

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <h1 className="page-title">Модерация</h1>
          <ModerationQueue
            initialCompanies={companies.map((c) => ({
              id: c.id,
              name: c.name,
              inn: c.inn,
              website: c.website,
              description: c.description,
              created_at: c.created_at,
            }))}
            initialVacancies={vacancies.map((v) => ({
              slug: v.slug,
              title: v.title,
              company: v.company,
              description: v.description,
              apply_mode: v.apply_mode,
              apply_url: v.apply_url,
              city: v.city,
            }))}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
