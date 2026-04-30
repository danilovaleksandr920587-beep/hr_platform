import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeClusterPage } from "@/components/knowledge-base/KnowledgeClusterPage";
import { clusterBySlug } from "@/lib/knowledge-clusters";
import "@/styles/knowledge-cluster.css";

const cluster = clusterBySlug("career");

export const metadata: Metadata = {
  title: "Карьерный рост после первого оффера — гайды и советы",
  description:
    "План развития после первого оффера: компетенции, рост роли и карьерная стратегия.",
  alternates: { canonical: "/knowledge-base/career" },
};

export default async function CareerClusterPage() {
  if (!cluster) return null;
  return (
    <>
      <KnowledgeClusterPage cluster={cluster} />
      <SiteFooter />
    </>
  );
}
