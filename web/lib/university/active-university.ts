import "server-only";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import type { AuthSession } from "@/lib/auth/token";
import { listUniversitiesForAccount, type UniversityMembership } from "./store";

export type ActiveUniversityContext = {
  session: AuthSession;
  university: UniversityMembership;
  universities: UniversityMembership[];
};

/**
 * Для страниц /vuz/*: требует сессию; без членства возвращает null -
 * страница показывает подсказку (в кабинет вуза попадают только по
 * приглашению, самозаписи нет - в отличие от /company/new).
 * Переключатель активного вуза - Фаза 3; пока первый из членств.
 */
export async function getActiveUniversity(
  nextPath: string,
): Promise<ActiveUniversityContext | null> {
  const session = await getSessionFromCookies();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const universities = await listUniversitiesForAccount(session.id);
  if (!universities.length) return null;

  return { session, university: universities[0], universities };
}
