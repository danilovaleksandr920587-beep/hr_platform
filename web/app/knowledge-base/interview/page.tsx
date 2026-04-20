import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeClusterPage } from "@/components/knowledge-base/KnowledgeClusterPage";
import { clusterBySlug } from "@/lib/knowledge-clusters";
import "@/styles/knowledge-cluster.css";

const cluster = clusterBySlug("interview");

export const metadata: Metadata = {
  title: "Хаб: собеседования",
  description:
    "Подготовка к интервью: типовые вопросы, примеры ответов и чеклисты.",
};

export default async function InterviewClusterPage() {
  if (!cluster) return null;
  return (
    <>
      <KnowledgeClusterPage cluster={cluster} />
      <SiteFooter />
    </>
  );
}

