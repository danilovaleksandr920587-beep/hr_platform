import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  getStudentProfile,
  getUniversityById,
  upsertStudentProfile,
} from "@/lib/university/store";

/** Учебный профиль студента (самодекларация вуза, vuz-portal-design.md §2 B). */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const profile = await getStudentProfile(session.id);
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    universityId?: string | null;
    faculty?: string;
    studyYear?: number | null;
    graduationYear?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  // universityId: undefined - не менять текущий выбор, null - очистить.
  const universityId =
    "universityId" in body && body.universityId !== undefined ? body.universityId : undefined;
  if (typeof universityId === "string") {
    if (!/^[0-9a-f-]{36}$/i.test(universityId)) {
      return NextResponse.json({ error: "Некорректный вуз." }, { status: 400 });
    }
    const university = await getUniversityById(universityId);
    if (!university || university.status !== "active") {
      return NextResponse.json({ error: "Вуз не найден." }, { status: 400 });
    }
  }

  const studyYear = body.studyYear ?? null;
  if (studyYear !== null && (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > 6)) {
    return NextResponse.json({ error: "Курс - число от 1 до 6." }, { status: 400 });
  }
  const graduationYear = body.graduationYear ?? null;
  if (
    graduationYear !== null &&
    (!Number.isInteger(graduationYear) || graduationYear < 2000 || graduationYear > 2100)
  ) {
    return NextResponse.json({ error: "Некорректный год выпуска." }, { status: 400 });
  }
  const faculty = String(body.faculty ?? "").slice(0, 200);

  try {
    await upsertStudentProfile(session.id, {
      universityId,
      faculty,
      studyYear,
      graduationYear,
    });
    const profile = await getStudentProfile(session.id);
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
