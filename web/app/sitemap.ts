import type { MetadataRoute } from "next";
import { listArticleSlugs } from "@/lib/data/articles";
import { listVacancySlugs } from "@/lib/data/vacancies";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const [vacancySlugs, articleSlugs] = await Promise.all([
    listVacancySlugs(),
    listArticleSlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/vacancies",
    "/knowledge-base",
    "/research",
    "/office",
    "/login",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "daily",
    priority: path === "" ? 1 : 0.8,
  }));

  const vacancies = vacancySlugs.map((slug) => ({
    url: `${base}/vacancies/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  const articles = articleSlugs.map((slug) => ({
    url: `${base}/knowledge-base/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));

  return [...staticRoutes, ...vacancies, ...articles];
}
