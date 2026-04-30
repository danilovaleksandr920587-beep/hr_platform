import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { KnowledgeClusterPage } from "@/components/knowledge-base/KnowledgeClusterPage";
import { clusterBySlug } from "@/lib/knowledge-clusters";
import "@/styles/knowledge-cluster.css";

const cluster = clusterBySlug("salary");

export const metadata: Metadata = {
  title: "Зарплата на собеседовании — как назвать цифру и вести переговоры",
  description:
    "Переговоры о зарплате, вилки, аргументация и разбор компенсации в оффере.",
  alternates: { canonical: "/knowledge-base/salary" },
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

