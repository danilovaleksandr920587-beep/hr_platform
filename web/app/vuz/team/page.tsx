import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { VuzNav } from "@/components/vuz/VuzNav";
import { VuzTeam } from "@/components/vuz/VuzTeam";
import { getActiveUniversity } from "@/lib/university/active-university";
import {
  listUniversityMembers,
  listUniversityInvites,
} from "@/lib/university/store";

export const metadata: Metadata = {
  title: "Команда - кабинет вуза",
  robots: { index: false, follow: false },
};

export default async function VuzTeamPage() {
  const context = await getActiveUniversity("/vuz/team");
  if (!context) redirect("/vuz");

  const { session, university } = context;
  const [members, invites] = await Promise.all([
    listUniversityMembers(university.id).catch(() => []),
    listUniversityInvites(university.id).catch(() => []),
  ]);

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 900 }}>
          <VuzNav universityName={university.short_name || university.name} />
          <VuzTeam
            universityId={university.id}
            selfAccountId={session.id}
            isOwner={university.role === "owner"}
            initialMembers={members.map((m) => ({
              account_id: m.account_id,
              role: m.role,
              status: m.status,
              email: m.email,
              display_name: m.display_name,
            }))}
            initialInvites={invites.map((i) => ({
              id: i.id,
              email: i.email,
              role: i.role,
              expires_at: i.expires_at,
            }))}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
