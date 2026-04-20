import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeClusterPage } from "@/components/knowledge-base/KnowledgeClusterPage";
import { clusterBySlug } from "@/lib/knowledge-clusters";
import "@/styles/knowledge-cluster.css";

const cluster = clusterBySlug("resume");

export const metadata: Metadata = {
  title: "Хаб: резюме",
  description:
    "Структура, ATS и примеры резюме для стажировок и первой работы.",
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

