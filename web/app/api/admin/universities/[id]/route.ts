import "server-only";
import { NextResponse } from "next/server";
import { requirePlatformAdmin, isAdminSession } from "@/lib/auth/platform-admin";
import { getUniversityById, updateUniversity } from "@/lib/university/store";
import { UNIVERSITY_STATUSES, type UniversityStatus } from "@/lib/university/constants";

type RouteProps = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteProps) {
  const session = await requirePlatformAdmin();
  if (!isAdminSession(session)) return session;

  const { id } = await params;
  const existing = await getUniversityById(id).catch(() => null);
  if (!existing) {
    return NextResponse.json({ error: "Вуз не найден." }, { status: 404 });
  }

  let body: {
    name?: string;
    shortName?: string | null;
    city?: string | null;
    region?: string | null;
    logoUrl?: string | null;
    status?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  if (body.name !== undefined && String(body.name).trim().length < 3) {
    return NextResponse.json({ error: "Название - минимум 3 символа." }, { status: 400 });
  }
  if (
    body.status !== undefined &&
    !UNIVERSITY_STATUSES.includes(body.status as UniversityStatus)
  ) {
    return NextResponse.json({ error: "Некорректный статус." }, { status: 400 });
  }
  const logoUrl =
    body.logoUrl !== undefined && body.logoUrl !== null
      ? String(body.logoUrl).trim().slice(0, 500)
      : body.logoUrl;
  if (logoUrl && !/^https:\/\/.+/i.test(logoUrl)) {
    return NextResponse.json(
      { error: "Логотип - прямая https-ссылка на картинку." },
      { status: 400 },
    );
  }

  try {
    const university = await updateUniversity(id, {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      shortName: body.shortName,
      city: body.city,
      region: body.region,
      logoUrl,
      status: body.status as UniversityStatus | undefined,
    });
    return NextResponse.json({ university });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
