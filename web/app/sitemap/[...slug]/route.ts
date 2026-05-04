import { listArticles } from "@/lib/data/articles";
import { listVacancies } from "@/lib/data/vacancies";

const STATIC_PATHS = [
  "",
  "/vacancies",
  "/knowledge-base",
  "/knowledge-base/resume",
  "/knowledge-base/interview",
  "/knowledge-base/test",
  "/knowledge-base/salary",
  "/knowledge-base/apply",
  "/knowledge-base/career",
  "/research",
  "/tools/salary-calculator",
  "/tools/resume-analyzer",
];

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderUrl({
  url,
  lastModified,
  changeFrequency,
  priority,
}: {
  url: string;
  lastModified: Date | string;
  changeFrequency: string;
  priority: number;
}) {
  const lastmod =
    lastModified instanceof Date ? lastModified.toISOString() : lastModified;

  return `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${escapeXml(changeFrequency)}</changefreq>
    <priority>${priority.toFixed(2)}</priority>
  </url>`;
}

function xmlResponse(body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

function sitemapIdFromSlug(slug: string[]) {
  if (slug.length !== 1) return null;

  const [fileName] = slug;
  return fileName.endsWith(".xml") ? fileName.slice(0, -4) : fileName;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const id = sitemapIdFromSlug(slug);
  const base = getBaseUrl();

  if (!id || !["static", "vacancies", "articles"].includes(id)) {
    return new Response("Not Found", { status: 404 });
  }

  const urls =
    id === "static"
      ? STATIC_PATHS.map((path) =>
          renderUrl({
            url: `${base}${path}`,
            lastModified: new Date(),
            changeFrequency: path === "" ? "weekly" : "daily",
            priority:
              path === ""
                ? 1
                : path.startsWith("/knowledge-base/")
                  ? 0.75
                  : 0.8,
          }),
        )
      : id === "vacancies"
        ? (await listVacancies({})).map((row) =>
            renderUrl({
              url: `${base}/vacancies/${row.slug}`,
              lastModified: row.published_at
                ? new Date(row.published_at)
                : new Date(),
              changeFrequency: "daily",
              priority: 0.72,
            }),
          )
        : (await listArticles({})).map((row) =>
            renderUrl({
              url: `${base}/knowledge-base/${row.slug}`,
              lastModified: row.published_at
                ? new Date(row.published_at)
                : new Date(),
              changeFrequency: "weekly",
              priority: 0.85,
            }),
          );

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`);
}
