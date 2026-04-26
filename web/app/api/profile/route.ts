import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getSql } from "@/lib/db/postgres";

export type UserProfile = {
  firstName: string;
  surname: string;
  direction: string;
  level: string;
  format: string;
  city: string;
};

type ProfileRow = {
  first_name: string;
  surname: string;
  direction: string;
  level: string;
  format: string;
  city: string;
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getSql();
  const rows = (await sql`
    SELECT first_name, surname, direction, level, format, city
    FROM user_profiles WHERE account_id = ${session.id} LIMIT 1
  `) as ProfileRow[];

  if (!rows[0]) {
    return NextResponse.json({ profile: null });
  }
  const r = rows[0];
  const profile: UserProfile = {
    firstName: r.first_name,
    surname: r.surname,
    direction: r.direction,
    level: r.level,
    format: r.format,
    city: r.city,
  };
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<UserProfile>;
  try {
    body = await req.json() as Partial<UserProfile>;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    INSERT INTO user_profiles (account_id, first_name, surname, direction, level, format, city, updated_at)
    VALUES (
      ${session.id},
      ${body.firstName ?? ""},
      ${body.surname ?? ""},
      ${body.direction ?? ""},
      ${body.level ?? ""},
      ${body.format ?? ""},
      ${body.city ?? ""},
      now()
    )
    ON CONFLICT (account_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      surname    = EXCLUDED.surname,
      direction  = EXCLUDED.direction,
      level      = EXCLUDED.level,
      format     = EXCLUDED.format,
      city       = EXCLUDED.city,
      updated_at = now()
  `;

  return NextResponse.json({ ok: true });
}
