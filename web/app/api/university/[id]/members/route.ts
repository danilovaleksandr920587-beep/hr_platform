import "server-only";
import { NextResponse } from "next/server";
import { requireUniversityRole, isUniversityAccess } from "@/lib/university/guard";
import { listUniversityMembers, listUniversityInvites } from "@/lib/university/store";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireUniversityRole(id, "staff");
  if (!isUniversityAccess(access)) return access;

  try {
    const [members, invites] = await Promise.all([
      listUniversityMembers(id),
      listUniversityInvites(id),
    ]);
    return NextResponse.json({ members, invites, role: access.role });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
