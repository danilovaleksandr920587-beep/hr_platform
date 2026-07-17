import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listUniversitiesForAccount } from "@/lib/university/store";

/** Вузы, где аккаунт состоит в ЦКС (для кабинета /vuz). */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const universities = await listUniversitiesForAccount(session.id);
    return NextResponse.json({
      universities: universities.map((u) => ({
        id: u.id,
        slug: u.slug,
        name: u.name,
        short_name: u.short_name,
        role: u.role,
      })),
    });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
