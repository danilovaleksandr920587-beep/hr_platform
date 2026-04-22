import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { ResumeAnalyzerPage } from "@/components/tools/ResumeAnalyzerPage";
import { getSessionFromCookies } from "@/lib/auth/session";
import "@/styles/resume-analyzer.css";

export const metadata: Metadata = {
  title: "AI-разбор резюме",
  description: "Пошаговый анализ резюме относительно вакансии с конкретными рекомендациями от YandexGPT.",
};

export default async function ResumeAnalyzerRoutePage() {
  const session = await getSessionFromCookies();
  return (
    <>
      <ResumeAnalyzerPage userScope={session?.id ?? null} />
      <SiteFooter />
    </>
  );
}
