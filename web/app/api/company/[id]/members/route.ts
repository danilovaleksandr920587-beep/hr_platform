import "server-only";
import { NextResponse } from "next/server";
import { requireCompanyRole, isCompanyAccess } from "@/lib/company/guard";
import { listMembers, listInvites } from "@/lib/company/store";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireCompanyRole(id, "recruiter");
  if (!isCompanyAccess(access)) return access;

  try {
    const [members, invites] = await Promise.all([listMembers(id), listInvites(id)]);
    return NextResponse.json({
      members,
      invites: invites.filter((i) => !i.accepted_at),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
