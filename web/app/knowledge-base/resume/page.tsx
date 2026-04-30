import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeClusterPage } from "@/components/knowledge-base/KnowledgeClusterPage";
import { clusterBySlug } from "@/lib/knowledge-clusters";
import "@/styles/knowledge-cluster.css";

const cluster = clusterBySlug("resume");

export const metadata: Metadata = {
  title: "Резюме для стажировки и первой работы — гайды и шаблоны",
  description:
    "Структура, ATS-оптимизация и примеры резюме для студентов и выпускников без опыта.",
  alternates: { canonical: "/knowledge-base/resume" },
};

export default async function ResumeClusterPage() {
  if (!cluster) return null;
  return (
    <>
      <KnowledgeClusterPage cluster={cluster} />
      <SiteFooter />
    </>
  );
}

