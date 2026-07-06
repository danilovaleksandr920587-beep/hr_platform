import "server-only";
import { NextResponse } from "next/server";
import { requirePlatformAdmin, isAdminSession } from "@/lib/auth/platform-admin";
import { listPendingCompanies } from "@/lib/company/store";
import { listVacanciesPendingReview } from "@/lib/company/vacancies";

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!isAdminSession(admin)) return admin;

  try {
    const [companies, vacancies] = await Promise.all([
      listPendingCompanies(),
      listVacanciesPendingReview(),
    ]);
    return NextResponse.json({ companies, vacancies });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
