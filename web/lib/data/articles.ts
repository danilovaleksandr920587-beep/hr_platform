import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPublishedSlugsFromRest } from "@/lib/supabase/rest-anon";
import type { ArticleRow } from "@/lib/types";

export type ArticleFilters = {
  q?: string;
  category?: string;
  level?: string;
};

export async function listArticles(
  filters: ArticleFilters = {},
): Promise<ArticleRow[]> {
  if (!isPublicSupabaseConfigured()) return [];

  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  let q = supabase
    .from("articles")
    .select("*")
    .eq("is_published", true)
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
  if (!isPublicSupabaseConfigured() || !slug) return null;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("getArticleBySlug", error.message);
    return null;
  }
  return (data as ArticleRow) ?? null;
}

export async function listArticleSlugs(): Promise<string[]> {
  if (!isPublicSupabaseConfigured()) return [];
  return listPublishedSlugsFromRest("articles");
}
