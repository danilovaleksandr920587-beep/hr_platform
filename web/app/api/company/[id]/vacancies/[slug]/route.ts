import "server-only";
import { NextResponse } from "next/server";
import { requireCompanyRole, isCompanyAccess } from "@/lib/company/guard";
import { getCompanyById } from "@/lib/company/store";
import {
  changeCompanyVacancyStatus,
  getCompanyVacancyBySlug,
  hasStructuredDescription,
  parseVacancyBody,
  updateCompanyVacancy,
  validateVacancyInput,
  type VacancyStatusAction,
} from "@/lib/company/vacancies";
import { notifyAdminsModerationQueue } from "@/lib/email/company-notifications";

type RouteProps = { params: Promise<{ id: string; slug: string }> };

export async function GET(_req: Request, { params }: RouteProps) {
  const { id, slug } = await params;
  const access = await requireCompanyRole(id, "recruiter");
  if (!isCompanyAccess(access)) return access;

  try {
    const vacancy = await getCompanyVacancyBySlug(id, slug);
    if (!vacancy) return NextResponse.json({ error: "Вакансия не найдена." }, { status: 404 });
    return NextResponse.json({ vacancy });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}

/**
 * PATCH с телом:
 *  { action: 'submit' | 'archive' | 'unarchive' } - смена статуса
 *  иначе - частичное редактирование полей вакансии
 */
export async function PATCH(req: Request, { params }: RouteProps) {
  const { id, slug } = await params;
  const access = await requireCompanyRole(id, "recruiter");
  if (!isCompanyAccess(access)) return access;

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  try {
    const company = await getCompanyById(id);
    if (!company) return NextResponse.json({ error: "Компания не найдена." }, { status: 404 });
    if (company.status === "blocked") {
      return NextResponse.json({ error: "Компания заблокирована." }, { status: 403 });
    }

    const action = typeof raw.action === "string" ? (raw.action as VacancyStatusAction) : null;

    if (action) {
      if (!["submit", "archive", "unarchive"].includes(action)) {
        return NextResponse.json({ error: "Некорректное действие." }, { status: 400 });
      }
      if (action === "submit" && company.status !== "verified") {
        return NextResponse.json(
          { error: "Публикация доступна после проверки компании. Дождитесь подтверждения." },
          { status: 403 },
        );
      }
      const vacancy = await changeCompanyVacancyStatus(id, slug, action, {
        trusted: company.trusted,
      });
      if (vacancy.status === "pending_review") {
        notifyAdminsModerationQueue({ kind: "vacancy", name: vacancy.title });
      }
      return NextResponse.json({ vacancy });
    }

    const input = parseVacancyBody(raw);
    const structured = hasStructuredDescription(raw);
    // Частичное редактирование: валидируем только присланные поля.
    // description и description_blocks собираются из структурных полей формы.
    const patch: Partial<typeof input> = {};
    for (const key of Object.keys(input) as (keyof typeof input)[]) {
      const provided =
        raw[key] !== undefined ||
        (key === "applyUrl" && raw.applyMode !== undefined) ||
        ((key === "description" || key === "descriptionBlocks") && structured);
      if (provided) {
        // @ts-expect-error - присваивание по ключу с общим типом
        patch[key] = input[key];
      }
    }
    const invalid = validateVacancyInput(patch);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const vacancy = await updateCompanyVacancy(company, slug, patch);
    if (vacancy.status === "pending_review") {
      notifyAdminsModerationQueue({ kind: "vacancy", name: vacancy.title });
    }
    return NextResponse.json({ vacancy });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка сервера.";
    if (message.includes("не найдена") || message.includes("можно")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
