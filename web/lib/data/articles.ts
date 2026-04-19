import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import type { ArticleRow } from "@/lib/types";

function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.length &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
  );
}

export type ArticleFilters = {
  q?: string;
  category?: string;
  level?: string;
};

export async function listArticles(
  filters: ArticleFilters = {},
): Promise<ArticleRow[]> {
  if (!configured()) return [];

  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  let q = supabase
    .from("articles")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (filters.category && filters.category !== "all") {
    q = q.eq("category", filters.category);
  }
  if (filters.level && filters.level !== "all") {
    q = q.eq("level", filters.level);
  }

  const { data, error } = await q;
  if (error) {
    console.error("listArticles", error.message);
    return [];
  }

  let rows = (data ?? []) as ArticleRow[];
  const needle = filters.q?.trim().toLowerCase();
  if (needle) {
    rows = rows.filter((row) => {
      const hay = `${row.title} ${row.excerpt}`.toLowerCase();
      return hay.includes(needle);
    });
  }
  return rows;
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleRow | null> {
  if (!configured() || !slug) return null;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) {
    console.error("getArticleBySlug", error.message);
    return null;
  }
  return (data as ArticleRow) ?? null;
}

export async function listArticleSlugs(): Promise<string[]> {
  if (!configured()) return [];
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select("slug")
    .eq("published", true);
  if (error) return [];
  return (data ?? []).map((r: { slug: string }) => r.slug);
}
