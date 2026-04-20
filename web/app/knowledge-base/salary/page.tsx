import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeClusterPage } from "@/components/knowledge-base/KnowledgeClusterPage";
import { clusterBySlug } from "@/lib/knowledge-clusters";
import "@/styles/knowledge-cluster.css";

const cluster = clusterBySlug("salary");

export const metadata: Metadata = {
  title: "Хаб: зарплата и офферы",
  description:
    "Переговоры о зарплате, вилки, аргументация и разбор компенсации в оффере.",
};

export default async function SalaryClusterPage() {
  if (!cluster) return null;
  return (
    <>
      <KnowledgeClusterPage cluster={cluster} />
      <SiteFooter />
    </>
  );
}

