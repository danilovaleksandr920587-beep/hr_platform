import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createCompany } from "@/lib/company/store";
import { notifyAdminsModerationQueue } from "@/lib/email/company-notifications";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`company-create:${session.id}`, 3, 24 * 60 * 60)) {
    return NextResponse.json(
      { error: "Слишком много компаний за сутки. Попробуйте позже." },
      { status: 429 },
    );
  }

  let body: { name?: string; inn?: string; website?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 200);
  if (name.length < 2) {
    return NextResponse.json({ error: "Укажите название компании." }, { status: 400 });
  }
  const inn = String(body.inn ?? "").trim().slice(0, 20);
  if (inn && !/^\d{10}(\d{2})?$/.test(inn)) {
    return NextResponse.json({ error: "ИНН - 10 или 12 цифр." }, { status: 400 });
  }

  try {
    const company = await createCompany({
      name,
      inn,
      website: String(body.website ?? "").trim().slice(0, 300),
      description: String(body.description ?? "").trim().slice(0, 5000),
      createdBy: session.id,
    });
    notifyAdminsModerationQueue({ kind: "company", name: company.name });
    return NextResponse.json({ company });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      return NextResponse.json(
        { error: "Компания с таким ИНН уже зарегистрирована. Попросите её владельца пригласить вас в команду." },
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
