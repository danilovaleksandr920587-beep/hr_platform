import "server-only";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { hashInviteToken } from "@/lib/company/invite-token";
import { acceptInvite, findInviteByTokenHash } from "@/lib/company/store";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Нет токена приглашения." }, { status: 400 });
  }

  try {
    const invite = await findInviteByTokenHash(hashInviteToken(token));
    if (!invite || invite.accepted_at) {
      return NextResponse.json(
        { error: "Приглашение не найдено или уже использовано." },
        { status: 404 },
      );
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Срок действия приглашения истёк. Попросите отправить новое." },
        { status: 410 },
      );
    }
    if (invite.email.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json(
        { error: `Приглашение отправлено на ${invite.email}. Войдите с этим email.` },
        { status: 403 },
      );
    }

    await acceptInvite(invite, session.id);
    return NextResponse.json({
      ok: true,
      companyId: invite.company_id,
      companyName: invite.company_name,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера." }, { status: 500 });
  }
}
