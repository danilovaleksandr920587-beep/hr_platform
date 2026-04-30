import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeClusterPage } from "@/components/knowledge-base/KnowledgeClusterPage";
import { clusterBySlug } from "@/lib/knowledge-clusters";
import "@/styles/knowledge-cluster.css";

const cluster = clusterBySlug("test");

export const metadata: Metadata = {
  title: "Тестовые задания — как выполнить и оформить",
  description:
    "Как решать тестовые задания, оценивать сроки и проходить live coding без стресса.",
  alternates: { canonical: "/knowledge-base/test" },
};

export default async function TestClusterPage() {
  if (!cluster) return null;
  return (
    <>
      <KnowledgeClusterPage cluster={cluster} />
      <SiteFooter />
    </>
  );
}

