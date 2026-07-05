import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { withdrawApplication } from "@/lib/company/applications";
import { deleteResumeFile } from "@/lib/company/resume-storage";

type RouteProps = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: RouteProps) {
  const { id } = await params;
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await withdrawApplication(id, session.id);
    if (!result) {
      return NextResponse.json({ error: "Отклик не найден." }, { status: 404 });
    }
    if (result.resumeFile) {
      await deleteResumeFile(result.resumeFile);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
