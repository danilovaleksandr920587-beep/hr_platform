import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { ResumeAnalyzerPage } from "@/components/tools/ResumeAnalyzerPage";
import "@/styles/resume-analyzer.css";

export const metadata: Metadata = {
  title: "AI-разбор резюме",
  description:
    "Пошаговый анализ резюме относительно вакансии с конкретными рекомендациями.",
};

export default function ResumeAnalyzerRoutePage() {
  return (
    <>
      <ResumeAnalyzerPage />
      <SiteFooter />
    </>
  );
}
