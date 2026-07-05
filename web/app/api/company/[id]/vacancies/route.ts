import "server-only";
import { NextResponse } from "next/server";
import { requireCompanyRole, isCompanyAccess } from "@/lib/company/guard";
import { getCompanyById } from "@/lib/company/store";
import {
  createCompanyVacancy,
  listCompanyVacancies,
  parseVacancyBody,
  validateVacancyInput,
} from "@/lib/company/vacancies";
import { rateLimit } from "@/lib/rate-limit";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireCompanyRole(id, "recruiter");
  if (!isCompanyAccess(access)) return access;

  try {
    const vacancies = await listCompanyVacancies(id);
    return NextResponse.json({ vacancies });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireCompanyRole(id, "recruiter");
  if (!isCompanyAccess(access)) return access;

  if (!rateLimit(`vacancy-create:${id}`, 20, 24 * 60 * 60)) {
    return NextResponse.json({ error: "Слишком много вакансий за сутки." }, { status: 429 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const input = parseVacancyBody(raw);
  const invalid = validateVacancyInput(input);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Компания не найдена." }, { status: 404 });
    }
    if (company.status === "blocked") {
      return NextResponse.json({ error: "Компания заблокирована." }, { status: 403 });
    }
    const vacancy = await createCompanyVacancy(company, input);
    return NextResponse.json({ vacancy });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
