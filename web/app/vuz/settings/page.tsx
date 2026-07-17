import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { VuzNav } from "@/components/vuz/VuzNav";
import { VuzShowcaseForm } from "@/components/vuz/VuzShowcaseForm";
import { getActiveUniversity } from "@/lib/university/active-university";

export const metadata: Metadata = {
  title: "Витрина - кабинет вуза",
  robots: { index: false, follow: false },
};

export default async function VuzSettingsPage() {
  const context = await getActiveUniversity("/vuz/settings");
  if (!context) redirect("/vuz");

  const { university } = context;
  const published = university.status === "active" && university.description.trim() !== "";

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 900 }}>
          <VuzNav universityName={university.short_name || university.name} />
          <p className="hero-text" style={{ margin: "16px 0" }}>
            Публичная страница вуза для студентов и абитуриентов.{" "}
            {published ? (
              <>
                Открыта:{" "}
                <Link className="text-link" href={`/universities/${university.slug}`}>
                  /universities/{university.slug}
                </Link>
                . Поставьте на неё ссылку с раздела «Карьера» сайта вуза.
              </>
            ) : (
              "Откроется после заполнения описания карьерного центра."
            )}
          </p>
          <VuzShowcaseForm
            universityId={university.id}
            slug={university.slug}
            initialDescription={university.description}
            initialContacts={university.contacts ?? {}}
            initialLogoUrl={university.logo_url ?? ""}
            initialPublicStats={university.public_stats}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
