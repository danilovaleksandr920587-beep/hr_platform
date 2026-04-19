import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Клиент для публичных SELECT по RLS (роль anon). Без cookies() —
 * безопасно в generateStaticParams, sitemap и при сборке на Vercel.
 * Для сессии пользователя используйте `@/lib/supabase/server`.
 */
export function createPublicSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.length || !anon?.length) return null;

  return createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
