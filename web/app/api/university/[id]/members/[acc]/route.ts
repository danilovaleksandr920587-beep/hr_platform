import "server-only";
import { NextResponse } from "next/server";
import { requireUniversityRole, isUniversityAccess } from "@/lib/university/guard";
import { updateUniversityMember } from "@/lib/university/store";
import { UNIVERSITY_ROLES, type UniversityRole } from "@/lib/university/constants";

type RouteProps = { params: Promise<{ id: string; acc: string }> };

/** Смена роли / деактивация члена ЦКС - только owner; себя менять нельзя
 *  (защита от вуза без owner, как в company-контуре). */
export async function PATCH(req: Request, { params }: RouteProps) {
  const { id, acc } = await params;
  const access = await requireUniversityRole(id, "owner");
  if (!isUniversityAccess(access)) return access;

  if (acc === access.session.id) {
    return NextResponse.json(
      { error: "Свою роль менять нельзя - иначе вуз останется без владельца." },
      { status: 400 },
    );
  }

  let body: { role?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  if (body.role !== undefined && !UNIVERSITY_ROLES.includes(body.role as UniversityRole)) {
    return NextResponse.json({ error: "Некорректная роль." }, { status: 400 });
  }
  if (body.status !== undefined && !["active", "disabled"].includes(body.status)) {
    return NextResponse.json({ error: "Некорректный статус." }, { status: 400 });
  }

  try {
    const updated = await updateUniversityMember(id, acc, {
      role: body.role as UniversityRole | undefined,
      status: body.status as "active" | "disabled" | undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: "Участник не найден." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
