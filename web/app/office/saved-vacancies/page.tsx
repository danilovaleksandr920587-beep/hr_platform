import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SavedVacanciesPage } from "@/components/office/SavedVacanciesPage";
import { isPasswordAuthConfigured } from "@/lib/auth/config";
import { getSessionFromCookies } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Сохраненные вакансии",
  robots: { index: false, follow: false },
};

export default async function OfficeSavedVacanciesRoute() {
  if (!isPasswordAuthConfigured()) {
    redirect("/login?next=/office/saved-vacancies");
  }
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login?next=/office/saved-vacancies");
  }

  return (
    <>
      <SavedVacanciesPage userScope={session.id} />
      <SiteFooter />
    </>
  );
}

