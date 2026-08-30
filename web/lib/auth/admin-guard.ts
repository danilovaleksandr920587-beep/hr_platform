import "server-only";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";

/**
 * Доступ к внутренним отчётам: только аккаунты из PLATFORM_ADMIN_EMAILS.
 * Вызывать в каждой странице раздела, а не только в layout: layout может быть
 * закеширован, а страница с отчётом всегда динамическая.
 */
export async function requireAnalyticsAdmin(nextPath: string) {
  const session = await getSessionFromCookies();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!isPlatformAdmin(session.email)) redirect("/");
  return session;
}
