import "server-only";
import { NextResponse } from "next/server";
import { requireCompanyRole, isCompanyAccess } from "@/lib/company/guard";
import { getCompanyById, updateCompanyProfile } from "@/lib/company/store";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireCompanyRole(id, "recruiter");
  if (!isCompanyAccess(access)) return access;

  const company = await getCompanyById(id);
  if (!company) return NextResponse.json({ error: "Компания не найдена." }, { status: 404 });
  return NextResponse.json({ company, role: access.role });
}

export async function PATCH(req: Request, { params }: RouteProps) {
  const { id } = await params;
  const access = await requireCompanyRole(id, "owner");
  if (!isCompanyAccess(access)) return access;

  let body: {
    name?: string;
    inn?: string;
    website?: string;
    description?: string;
    logoUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  if (body.name !== undefined && String(body.name).trim().length < 2) {
    return NextResponse.json({ error: "Название - минимум 2 символа." }, { status: 400 });
  }
  if (body.inn !== undefined) {
    const inn = String(body.inn).trim();
    if (inn && !/^\d{10}(\d{2})?$/.test(inn)) {
      return NextResponse.json({ error: "ИНН - 10 или 12 цифр." }, { status: 400 });
    }
  }

  try {
    await updateCompanyProfile(id, {
      name: body.name !== undefined ? String(body.name).trim().slice(0, 200) : undefined,
      inn: body.inn !== undefined ? String(body.inn).trim().slice(0, 20) : undefined,
      website: body.website !== undefined ? String(body.website).trim().slice(0, 300) : undefined,
      description:
        body.description !== undefined ? String(body.description).trim().slice(0, 5000) : undefined,
      logoUrl: body.logoUrl !== undefined ? String(body.logoUrl).trim().slice(0, 500) : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      return NextResponse.json({ error: "Компания с таким ИНН уже есть." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
