import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { isPublicSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listPublishedSlugsFromRest } from "@/lib/supabase/rest-anon";
import type { ArticleRow } from "@/lib/types";

export type ArticleFilters = {
  q?: string;
  category?: string;
  level?: string;
  includeBody?: boolean;
  limit?: number;
};

const ARTICLE_SELECT_LIST =
  "id,slug,title,category,level,read_time,excerpt,is_new,cat_slug,layout,published_at";
const ARTICLE_SELECT_DETAIL = `${ARTICLE_SELECT_LIST},body`;

function escapeIlikeTerm(value: string): string {
  return value.replace(/[%_]/g, "\\$&").replace(/,/g, "\\,");
}

export async function listArticles(
  filters: ArticleFilters = {},
): Promise<ArticleRow[]> {
  if (!isPublicSupabaseConfigured()) return [];

  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  let q = supabase
    .from("articles")
    .select(filters.includeBody ? ARTICLE_SELECT_DETAIL : ARTICLE_SELECT_LIST)
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (filters.category && filters.category !== "all") {
    q = q.eq("category", filters.category);
  }
  if (filters.level && filters.level !== "all") {
    q = q.eq("level", filters.level);
  }
  const needle = filters.q?.trim();
  if (needle) {
    const term = `%${escapeIlikeTerm(needle)}%`;
    q = q.or(`title.ilike.${term},excerpt.ilike.${term}`);
  }
  if (filters.limit && filters.limit > 0) {
    q = q.limit(filters.limit);
  }

  const { data, error } = await q;
  if (error) {
    console.error("listArticles", error.message);
    return [];
  }

  return ((data ?? []) as unknown) as ArticleRow[];
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleRow | null> {
  if (!isPublicSupabaseConfigured() || !slug) return null;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT_DETAIL)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("getArticleBySlug", error.message);
    return null;
  }
  return ((data as unknown) as ArticleRow) ?? null;
}

export async function listArticleSlugs(): Promise<string[]> {
  if (!isPublicSupabaseConfigured()) return [];
  return listPublishedSlugsFromRest("articles");
}
