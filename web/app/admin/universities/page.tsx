import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { UniversitiesManager } from "@/components/admin/UniversitiesManager";
import { getSessionFromCookies } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { listUniversitiesForAdmin } from "@/lib/university/store";

export const metadata: Metadata = {
  title: "Вузы - онбординг",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminUniversitiesPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/admin/universities");
  if (!isPlatformAdmin(session.email)) redirect("/");

  const universities = await listUniversitiesForAdmin().catch(() => []);

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <h1 className="page-title">Вузы</h1>
          <p className="hero-text" style={{ marginBottom: 20 }}>
            Онбординг вузов-пилотов: создать вуз и пригласить руководителя ЦКС.
            Витрина публикуется после заполнения описания ЦКС в кабинете вуза.
          </p>
          <UniversitiesManager
            initial={universities.map((u) => ({
              id: u.id,
              slug: u.slug,
              name: u.name,
              short_name: u.short_name,
              city: u.city,
              region: u.region,
              status: u.status,
              student_count: u.student_count,
              member_count: u.member_count,
            }))}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
