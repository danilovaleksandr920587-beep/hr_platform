import { NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";

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

  if (!slugs.length) return NextResponse.json({ rows: [] });
  if (!isPublicSupabaseConfigured()) return NextResponse.json({ rows: [] });

  const supabase = createPublicSupabaseClient();
  if (!supabase) return NextResponse.json({ rows: [] });

  const { data, error } = await supabase
    .from("articles")
    .select("slug,title,category,level,read_time,excerpt,is_new,cat_slug")
    .eq("is_published", true)
    .in("slug", slugs);

  if (error) {
    console.error("articles/by-slugs", error.message);
    return NextResponse.json({ rows: [] });
  }

  return NextResponse.json({ rows: data ?? [] });
}
