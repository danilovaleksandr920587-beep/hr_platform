import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeClusterPage } from "@/components/knowledge-base/KnowledgeClusterPage";
import { clusterBySlug } from "@/lib/knowledge-clusters";
import "@/styles/knowledge-cluster.css";

const cluster = clusterBySlug("apply");

export const metadata: Metadata = {
  title: "Отклики и сопроводительные письма — стратегия поиска работы",
  description:
    "Сопроводительные письма и стратегия откликов: как повысить шанс ответа от работодателя.",
  alternates: { canonical: "/knowledge-base/apply" },
};

export default async function ApplyClusterPage() {
  if (!cluster) return null;
  return (
    <>
      <KnowledgeClusterPage cluster={cluster} />
      <SiteFooter />
    </>
  );
}
