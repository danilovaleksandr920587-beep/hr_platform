import { listPublishedSlugsFromRest } from "@/lib/supabase/rest-anon";

/** Только для `generateStaticParams` — без `@supabase/supabase-js` в графе импорта. */
export async function buildVacancyStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await listPublishedSlugsFromRest("vacancies");
  return slugs.map((slug) => ({ slug }));
}
