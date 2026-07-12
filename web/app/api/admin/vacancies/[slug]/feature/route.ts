import "server-only";
import { NextResponse } from "next/server";
import { requirePlatformAdmin, isAdminSession } from "@/lib/auth/platform-admin";
import { setVacancyFeatured } from "@/lib/company/vacancies";

type RouteProps = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: RouteProps) {
  const { slug } = await params;
  const admin = await requirePlatformAdmin();
  if (!isAdminSession(admin)) return admin;

  let body: { featured?: boolean; days?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const featured = Boolean(body.featured);
  const daysRaw = Number(body.days);
  // Срок ограничиваем разумным диапазоном; 0/пусто = бессрочно (редакционное).
  const days =
    Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(Math.floor(daysRaw), 365) : undefined;

  try {
    const vacancy = await setVacancyFeatured(slug, featured, days);
    return NextResponse.json({ vacancy });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: "Вакансия не найдена или не опубликована." },
        { status: 404 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
