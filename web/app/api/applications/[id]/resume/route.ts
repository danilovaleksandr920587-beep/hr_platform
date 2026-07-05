import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getApplicationById } from "@/lib/company/applications";
import { getMembership } from "@/lib/company/store";
import { readResumeFile } from "@/lib/company/resume-storage";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";

type RouteProps = { params: Promise<{ id: string }> };

/** Файл резюме: доступ только кандидату-владельцу, членам компании и админу. */
export async function GET(_req: Request, { params }: RouteProps) {
  const { id } = await params;
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const application = await getApplicationById(id);
    if (!application || !application.resume_file) {
      return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
    }

    const isOwner = application.account_id === session.id;
    let allowed = isOwner || isPlatformAdmin(session.email);
    if (!allowed) {
      const membership = await getMembership(application.company_id, session.id);
      allowed = Boolean(membership && membership.status === "active");
    }
    if (!allowed) {
      return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
    }

    const file = await readResumeFile(application.resume_file);
    if (!file) return NextResponse.json({ error: "Файл не найден." }, { status: 404 });

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="resume-${id}${application.resume_file.slice(application.resume_file.lastIndexOf("."))}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
