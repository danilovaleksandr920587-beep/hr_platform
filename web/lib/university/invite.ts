import "server-only";
import { getUniversityById, createUniversityInvite } from "./store";
import { generateInviteToken } from "@/lib/company/invite-token";
import { notifyUniversityInvite } from "@/lib/email/university-notifications";
import { isSmtpConfigured } from "@/lib/email/smtp";
import { getRealOrigin } from "@/lib/http/origin";
import type { UniversityRole } from "./constants";

export type IssueInviteResult =
  | { ok: true; inviteUrl: string; emailSent: boolean }
  | { ok: false };

/**
 * Создать приглашение в ЦКС и (если настроен SMTP) отправить письмо.
 * Общая логика для админского онбординга и приглашений внутри кабинета вуза.
 * Ссылку возвращаем всегда - без SMTP её передают вручную (часто в ТГ).
 */
export async function issueUniversityInvite(input: {
  universityId: string;
  email: string;
  role: UniversityRole;
  invitedBy: string;
}): Promise<IssueInviteResult> {
  const university = await getUniversityById(input.universityId);
  if (!university) return { ok: false };

  const generated = generateInviteToken();
  await createUniversityInvite({
    universityId: input.universityId,
    email: input.email,
    role: input.role,
    tokenHash: generated.tokenHash,
    invitedBy: input.invitedBy,
    expiresAtIso: generated.expiresAtIso,
  });

  const origin = await getRealOrigin();
  const inviteUrl = `${origin}/vuz-invite?token=${generated.token}`;
  const emailSent = isSmtpConfigured();
  if (emailSent) {
    notifyUniversityInvite({
      to: input.email,
      universityName: university.short_name || university.name,
      inviteUrl,
    });
  }
  return { ok: true, inviteUrl, emailSent };
}
