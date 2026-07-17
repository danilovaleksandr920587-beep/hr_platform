import "server-only";
import { NextResponse } from "next/server";
import { searchUniversities } from "@/lib/university/store";

/** Публичный поиск по справочнику вузов - для селекта «Ваш вуз» в кабинете. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").slice(0, 100);
  try {
    const universities = await searchUniversities(q);
    return NextResponse.json({ universities });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
