import "server-only";
import { NextResponse } from "next/server";
import { requireUniversityRole, isUniversityAccess } from "@/lib/university/guard";
import { getUniversityDashboard } from "@/lib/university/stats";

type RouteProps = { params: Promise<{ id: string }> };

/** Агрегаты дашборда - только обезличенные счётчики (§6 дизайн-дока). */
export async function GET(_req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireUniversityRole(id, "staff");
  if (!isUniversityAccess(access)) return access;

  try {
    const dashboard = await getUniversityDashboard(id);
    return NextResponse.json({ dashboard });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
