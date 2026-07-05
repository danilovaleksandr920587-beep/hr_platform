import "server-only";
import { NextResponse } from "next/server";
import { requireCompanyRole, isCompanyAccess } from "@/lib/company/guard";
import { countOwners, getMembership, updateMember } from "@/lib/company/store";
import { COMPANY_ROLES, type CompanyRole } from "@/lib/company/constants";

type RouteProps = { params: Promise<{ id: string; accountId: string }> };

export async function PATCH(req: Request, { params }: RouteProps) {
  const { id, accountId } = await params;
  const access = await requireCompanyRole(id, "owner");
  if (!isCompanyAccess(access)) return access;

  let body: { role?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const role = body.role as CompanyRole | undefined;
  const status = body.status as "active" | "disabled" | undefined;
  if (role !== undefined && !COMPANY_ROLES.includes(role)) {
    return NextResponse.json({ error: "Некорректная роль." }, { status: 400 });
  }
  if (status !== undefined && status !== "active" && status !== "disabled") {
    return NextResponse.json({ error: "Некорректный статус." }, { status: 400 });
  }

  const target = await getMembership(id, accountId);
  if (!target) {
    return NextResponse.json({ error: "Участник не найден." }, { status: 404 });
  }

  // Нельзя оставить компанию без активного владельца
  const demotesOwner =
    target.role === "owner" &&
    ((role !== undefined && role !== "owner") || status === "disabled");
  if (demotesOwner && (await countOwners(id)) <= 1) {
    return NextResponse.json(
      { error: "Нельзя убрать последнего владельца. Сначала назначьте другого." },
      { status: 400 },
    );
  }

  try {
    await updateMember(id, accountId, { role, status });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
