import { listPublishedSlugsFromRest } from "@/lib/supabase/rest-anon";

/** Только для `generateStaticParams` — без `@supabase/supabase-js` в графе импорта. */
export async function buildArticleStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await listPublishedSlugsFromRest("articles");
  return slugs.map((slug) => ({ slug }));
}
