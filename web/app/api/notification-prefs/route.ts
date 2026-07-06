import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getEmailPrefs, setEmailPrefs } from "@/lib/company/notifications-store";

const KNOWN_TYPES = [
  "application_new",
  "application_status",
  "company_invite",
  "company_moderation",
  "vacancy_moderation",
];

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const prefs = await getEmailPrefs(session.id);
    return NextResponse.json({ prefs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ prefs: {} });
  }
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { prefs?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const clean: Record<string, boolean> = {};
  for (const t of KNOWN_TYPES) {
    if (body.prefs && body.prefs[t] !== undefined) clean[t] = body.prefs[t] !== false;
  }

  try {
    await setEmailPrefs(session.id, clean);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
