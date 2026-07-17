import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { VuzInviteAcceptClient } from "@/components/vuz/VuzInviteAcceptClient";
import { getSessionFromCookies } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Приглашение в кабинет вуза",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ token?: string }> };

export default async function VuzInvitePage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  if (!token) redirect("/");

  const session = await getSessionFromCookies();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/vuz-invite?token=${token}`)}`);
  }

  return (
    <>
      <main className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <h1 className="page-title">Приглашение в кабинет вуза</h1>
          <VuzInviteAcceptClient token={token} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
