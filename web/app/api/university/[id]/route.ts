import "server-only";
import { NextResponse } from "next/server";
import { requireUniversityRole, isUniversityAccess } from "@/lib/university/guard";
import { getUniversityById, updateUniversity } from "@/lib/university/store";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireUniversityRole(id, "staff");
  if (!isUniversityAccess(access)) return access;

  const university = await getUniversityById(id);
  if (!university) {
    return NextResponse.json({ error: "Вуз не найден." }, { status: 404 });
  }
  return NextResponse.json({ university, role: access.role });
}

/** Витрина и контакты ЦКС; название/город/статус меняет только админ платформы. */
export async function PATCH(req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireUniversityRole(id, "staff");
  if (!isUniversityAccess(access)) return access;

  let body: {
    description?: string;
    contacts?: Record<string, string>;
    logoUrl?: string | null;
    publicStats?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const description =
    body.description !== undefined ? String(body.description).slice(0, 4000) : undefined;

  let contacts: Record<string, string> | undefined;
  if (body.contacts !== undefined) {
    if (typeof body.contacts !== "object" || body.contacts === null) {
      return NextResponse.json({ error: "Некорректные контакты." }, { status: 400 });
    }
    const allowed = ["email", "phone", "telegram", "website", "address"];
    contacts = {};
    for (const key of allowed) {
      const value = (body.contacts as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) {
        contacts[key] = value.trim().slice(0, 200);
      }
    }
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
      description,
      contacts,
      logoUrl,
      publicStats: typeof body.publicStats === "boolean" ? body.publicStats : undefined,
    });
    return NextResponse.json({ university });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
