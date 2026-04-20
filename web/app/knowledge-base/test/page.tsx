import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeClusterPage } from "@/components/knowledge-base/KnowledgeClusterPage";
import { clusterBySlug } from "@/lib/knowledge-clusters";
import "@/styles/knowledge-cluster.css";

const cluster = clusterBySlug("test");

export const metadata: Metadata = {
  title: "Хаб: тестовые задания",
  description:
    "Как решать тестовые, оценивать сроки и проходить live coding без стресса.",
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

