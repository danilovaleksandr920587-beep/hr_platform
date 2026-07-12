import "server-only";
import { NextResponse } from "next/server";
import { incrementVacancyStat } from "@/lib/company/stats";

type RouteProps = { params: Promise<{ slug: string }> };

/**
 * Публичный трекинг просмотров/кликов вакансии (для дашборда работодателя).
 * Вызывается с клиента (beacon). Без строгой защиты от накрутки - метрика
 * директивная, не биллинговая. Всегда 204, чтобы не мешать навигации.
 */
export async function POST(req: Request, { params }: RouteProps) {
  const { slug } = await params;
  let event: unknown;
  try {
    const body = (await req.json()) as { event?: unknown };
    event = body.event;
  } catch {
    event = "view";
  }
  const kind = event === "apply" ? "apply" : "view";
  await incrementVacancyStat(slug, kind);
  return new NextResponse(null, { status: 204 });
}
