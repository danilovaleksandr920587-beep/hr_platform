import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { ResearchSalaryDashboard } from "@/components/research/ResearchSalaryDashboard";
import "@/styles/research-salary-dashboard.css";

export const metadata: Metadata = {
  title: "Исследования",
  description:
    "Ориентиры по junior и стажировкам — чтобы обсуждать компенсацию спокойно.",
};

export default function ResearchPage() {
  return (
    <>
      <ResearchSalaryDashboard />
      <SiteFooter />
    </>
  );
}
