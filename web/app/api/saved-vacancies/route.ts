import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getSql } from "@/lib/db/postgres";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ slugs: [] });
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT vacancy_slug FROM public.user_saved_vacancies
      WHERE account_id = ${session.id} ORDER BY saved_at DESC
    `) as { vacancy_slug: string }[];
    return NextResponse.json({ slugs: rows.map((r) => r.vacancy_slug) });
  } catch {
    return NextResponse.json({ slugs: [] });
  }
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = (await req.json()) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  try {
    const sql = getSql();
    await sql`
      INSERT INTO public.user_saved_vacancies (account_id, vacancy_slug)
      VALUES (${session.id}, ${slug}) ON CONFLICT DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = (await req.json()) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  try {
    const sql = getSql();
    await sql`
      DELETE FROM public.user_saved_vacancies
      WHERE account_id = ${session.id} AND vacancy_slug = ${slug}
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
