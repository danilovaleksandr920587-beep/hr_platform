import "server-only";
import { NextResponse } from "next/server";
import { requireCompanyRole, isCompanyAccess } from "@/lib/company/guard";
import { listApplicationsForCompany } from "@/lib/company/applications";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/company/constants";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireCompanyRole(id, "recruiter");
  if (!isCompanyAccess(access)) return access;

  const url = new URL(req.url);
  const vacancySlug = url.searchParams.get("vacancy") ?? undefined;
  const statusParam = url.searchParams.get("status") ?? undefined;
  const status =
    statusParam && APPLICATION_STATUSES.includes(statusParam as ApplicationStatus)
      ? (statusParam as ApplicationStatus)
      : undefined;

  try {
    const applications = await listApplicationsForCompany(id, { vacancySlug, status });
    return NextResponse.json({ applications });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
