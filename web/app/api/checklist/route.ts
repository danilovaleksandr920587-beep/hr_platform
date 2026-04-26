import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getSql } from "@/lib/db/postgres";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ items: [] });
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT item_id, done FROM public.user_checklist_progress
      WHERE account_id = ${session.id}
    `) as { item_id: string; done: boolean }[];
    return NextResponse.json({ items: rows });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { itemId, done } = (await req.json()) as { itemId?: string; done?: boolean };
  if (!itemId) return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  try {
    const sql = getSql();
    await sql`
      INSERT INTO public.user_checklist_progress (account_id, item_id, done, updated_at)
      VALUES (${session.id}, ${itemId}, ${done ?? true}, now())
      ON CONFLICT (account_id, item_id) DO UPDATE SET done = EXCLUDED.done, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
