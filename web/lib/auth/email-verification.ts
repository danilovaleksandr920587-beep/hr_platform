import { createHash, randomBytes } from "crypto";

// Ссылка живёт дольше сброса пароля: письмо подтверждения человек может
// открыть не сразу.
const VERIFY_TTL_HOURS = 48;

export function generateEmailVerificationToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAtIso: new Date(Date.now() + VERIFY_TTL_HOURS * 60 * 60 * 1000).toISOString(),
  };
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}
