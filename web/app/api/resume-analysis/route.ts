import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getSql } from "@/lib/db/postgres";

type AnalysisRow = { score: number; result_json: unknown; target_role: string | null; created_at: string };

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ analysis: null });

  const sql = getSql();
  const rows = (await sql`
    SELECT score, result_json, target_role, created_at
    FROM user_resume_analyses
    WHERE account_id = ${session.id}
    ORDER BY created_at DESC LIMIT 1
  `) as AnalysisRow[];

  if (!rows[0]) return NextResponse.json({ analysis: null });
  return NextResponse.json({ analysis: rows[0] });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { score?: number; result?: unknown; targetRole?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (typeof body.score !== "number") {
    return NextResponse.json({ error: "score required" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    INSERT INTO user_resume_analyses (account_id, score, result_json, target_role)
    VALUES (${session.id}, ${body.score}, ${JSON.stringify(body.result ?? {})}, ${body.targetRole ?? null})
  `;

  return NextResponse.json({ ok: true });
}
