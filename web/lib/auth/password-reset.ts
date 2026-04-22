import { createHash, randomBytes } from "crypto";

const RESET_TTL_MINUTES = 30;

export function generatePasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAtIso: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000).toISOString(),
  };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

