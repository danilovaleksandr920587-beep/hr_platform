import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyCreateForm } from "@/components/company/CompanyCreateForm";
import { getSessionFromCookies } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Регистрация компании",
  robots: { index: false, follow: false },
};

export default async function CompanyNewPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/company/new");

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <h1 className="page-title">Регистрация компании</h1>
          <p className="hero-text" style={{ marginBottom: 20 }}>
            Создайте компанию, чтобы публиковать вакансии и получать отклики джунов и стажёров.
          </p>
          <CompanyCreateForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
