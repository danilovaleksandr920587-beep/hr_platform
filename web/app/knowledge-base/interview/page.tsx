import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeClusterPage } from "@/components/knowledge-base/KnowledgeClusterPage";
import { clusterBySlug } from "@/lib/knowledge-clusters";
import "@/styles/knowledge-cluster.css";

const cluster = clusterBySlug("interview");

export const metadata: Metadata = {
  title: "Собеседование — подготовка, вопросы и ответы",
  description:
    "Подготовка к интервью: типовые вопросы, готовые ответы, метод STAR и чек-листы.",
  alternates: { canonical: "/knowledge-base/interview" },
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

