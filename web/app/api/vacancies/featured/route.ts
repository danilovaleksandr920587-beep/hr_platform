import { NextResponse } from "next/server";
import { listVacancies } from "@/lib/data/vacancies";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sphere = searchParams.get("sphere");
  const expRaw = searchParams.get("exp");
  const format = searchParams.get("format");
  const limit = Math.min(Number(searchParams.get("limit") ?? "4"), 20);

  const rows = await listVacancies({
    sphere: sphere ? [sphere] : undefined,
    exp: expRaw ? expRaw.split(",").filter(Boolean) : undefined,
    format: format ? [format] : undefined,
    limit,
    fields: "card",
  });

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
      city: r.city,
      apply_url: r.apply_url,
    })),
  });
}
