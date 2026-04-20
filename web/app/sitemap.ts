import type { MetadataRoute } from "next";
import { listArticles } from "@/lib/data/articles";
import { listVacancies } from "@/lib/data/vacancies";

type SitemapCluster = "static" | "vacancies" | "articles";

export async function generateSitemaps() {
  return [
    { id: "static" },
    { id: "vacancies" },
    { id: "articles" },
  ] as Array<{ id: SitemapCluster }>;
}

export default async function sitemap({
  id,
}: {
  id: SitemapCluster;
}): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  if (id === "static") {
    return [
      "",
      "/vacancies",
      "/knowledge-base",
      "/knowledge-base/resume",
      "/knowledge-base/interview",
      "/knowledge-base/test",
      "/knowledge-base/salary",
      "/research",
    ].map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? "weekly" : "daily",
      priority:
        path === ""
          ? 1
          : path.startsWith("/knowledge-base/")
            ? 0.82
            : 0.8,
    }));
  }

  if (id === "vacancies") {
    const vacancies = await listVacancies({});
    return vacancies.map((row) => ({
      url: `${base}/vacancies/${row.slug}`,
      lastModified: row.published_at ? new Date(row.published_at) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.72,
    }));
  }

  const articles = await listArticles({});
  return articles.map((row) => ({
    url: `${base}/knowledge-base/${row.slug}`,
    lastModified: row.published_at ? new Date(row.published_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.68,
  }));
}
