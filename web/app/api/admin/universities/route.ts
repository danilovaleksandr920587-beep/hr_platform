import "server-only";
import { NextResponse } from "next/server";
import { requirePlatformAdmin, isAdminSession } from "@/lib/auth/platform-admin";
import {
  createUniversity,
  listUniversitiesForAdmin,
} from "@/lib/university/store";

/** Онбординг вузов - только владелец платформы (самозаписи вузов нет). */
export async function GET() {
  const session = await requirePlatformAdmin();
  if (!isAdminSession(session)) return session;
  try {
    const universities = await listUniversitiesForAdmin();
    return NextResponse.json({ universities });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await requirePlatformAdmin();
  if (!isAdminSession(session)) return session;

  let body: {
    name?: string;
    shortName?: string;
    city?: string;
    region?: string;
    logoUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (name.length < 3) {
    return NextResponse.json({ error: "Название - минимум 3 символа." }, { status: 400 });
  }
  const logoUrl = body.logoUrl ? String(body.logoUrl).trim().slice(0, 500) : "";
  if (logoUrl && !/^https:\/\/.+/i.test(logoUrl)) {
    return NextResponse.json(
      { error: "Логотип - прямая https-ссылка на картинку." },
      { status: 400 },
    );
  }

  try {
    const university = await createUniversity({
      name,
      shortName: body.shortName ? String(body.shortName).trim().slice(0, 100) : undefined,
      city: body.city ? String(body.city).trim().slice(0, 100) : undefined,
      region: body.region ? String(body.region).trim().slice(0, 100) : undefined,
      logoUrl: logoUrl || undefined,
      createdBy: session.id,
    });
    return NextResponse.json({ university }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
