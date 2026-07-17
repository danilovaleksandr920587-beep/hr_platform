const SITEMAP_IDS = ["static", "vacancies", "articles", "companies", "universities"] as const;

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function GET() {
  const base = getBaseUrl();
  const entries = SITEMAP_IDS.map(
    (id) => `  <sitemap>
    <loc>${base}/sitemap/${id}.xml</loc>
  </sitemap>`,
  ).join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    },
  );
}
