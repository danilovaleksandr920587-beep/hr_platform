import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyNav } from "@/components/company/CompanyNav";
import { TeamPanel } from "@/components/company/TeamPanel";
import { requireActiveCompany } from "@/lib/company/active-company";
import { listInvites, listMembers } from "@/lib/company/store";

export const metadata: Metadata = {
  title: "Команда компании",
  robots: { index: false, follow: false },
};

export default async function CompanyTeamPage() {
  const { session, company } = await requireActiveCompany("/company/team");
  const [members, invites] = await Promise.all([
    listMembers(company.id).catch(() => []),
    listInvites(company.id).catch(() => []),
  ]);

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <CompanyNav companyName={company.name} />
          <h1 className="page-title">Команда</h1>
          <TeamPanel
            companyId={company.id}
            viewerAccountId={session.id}
            viewerRole={company.role}
            initialMembers={members}
            initialInvites={invites
              .filter((i) => !i.accepted_at)
              .map((i) => ({ id: i.id, email: i.email, role: i.role, expires_at: i.expires_at }))}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
