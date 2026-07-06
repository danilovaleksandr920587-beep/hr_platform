import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listCompaniesForAccount } from "@/lib/company/store";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const companies = await listCompaniesForAccount(session.id);
    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        status: c.status,
        role: c.role,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
