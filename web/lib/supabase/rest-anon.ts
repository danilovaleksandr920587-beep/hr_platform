/**
 * Прямые запросы к PostgREST без @supabase/ssr и без cookies().
 * Используется для путей, которые Next выполняет при сборке (generateStaticParams, sitemap).
 */

function anonHeaders(): HeadersInit {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
}

export async function listPublishedSlugsFromRest(
  table: "articles" | "vacancies",
): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base?.length || !key?.length) return [];

  const url = `${base}/rest/v1/${table}?select=slug&published=eq.true`;
  const res = await fetch(url, {
    headers: anonHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`listPublishedSlugsFromRest ${table}`, res.status);
    return [];
  }

  const data = (await res.json()) as { slug: string | null }[];
  return data
    .map((r) => r.slug)
    .filter((s): s is string => typeof s === "string" && s.length > 0);
}
