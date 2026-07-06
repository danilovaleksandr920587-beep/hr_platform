import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listNotifications } from "@/lib/company/notifications-store";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { items, unread } = await listNotifications(session.id);
    return NextResponse.json({ items, unread });
  } catch (e) {
    // notifications может быть ещё не мигрирована - не роняем шапку
    console.error(e);
    return NextResponse.json({ items: [], unread: 0 });
  }
}
