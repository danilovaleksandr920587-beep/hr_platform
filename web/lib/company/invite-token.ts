import { createHash, randomBytes } from "crypto";

const INVITE_TTL_DAYS = 7;

export function generateInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashInviteToken(token),
    expiresAtIso: new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}
