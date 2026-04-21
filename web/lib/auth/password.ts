import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SALT_LEN = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = scryptSync(password, salt, 64);
  return `scl$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith("scl$")) return false;
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [, saltB64, keyB64] = parts;
  if (!saltB64 || !keyB64) return false;
  try {
    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(keyB64, "base64url");
    const key = scryptSync(password, salt, expected.length);
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}
