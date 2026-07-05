import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { InviteAcceptClient } from "@/components/company/InviteAcceptClient";
import { getSessionFromCookies } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Приглашение в компанию",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ token?: string }> };

export default async function CompanyInvitePage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  if (!token) redirect("/");

  const session = await getSessionFromCookies();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/company-invite?token=${token}`)}`);
  }

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <h1 className="page-title">Приглашение в компанию</h1>
          <InviteAcceptClient token={token} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
