import { NextResponse } from "next/server";
import { listVacanciesBySlugs } from "@/lib/data/vacancies";

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

  const rows = await listVacanciesBySlugs(slugs);
  return NextResponse.json({
    rows: rows.map((r) => ({
      slug: r.slug,
      company: r.company,
      title: r.title,
      exp: r.exp,
      type: r.type,
      format: r.format,
      salary_min: r.salary_min,
      salary_max: r.salary_max,
    })),
  });
}

