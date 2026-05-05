import { NextResponse } from "next/server";
import { listArticlesBySlugs } from "@/lib/data/articles";

export async function POST(req: Request) {
  let body: { slugs?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const slugs = Array.isArray(body.slugs)
    ? body.slugs.filter((v): v is string => typeof v === "string")
    : [];

  if (!slugs.length) {
    return NextResponse.json({ rows: [] });
  }

  const rows = await listArticlesBySlugs(slugs);
  return NextResponse.json({
    rows: rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      category: r.category,
      cat_slug: r.cat_slug,
      read_time: r.read_time,
      excerpt: r.excerpt,
      is_new: r.is_new,
    })),
  });
}
