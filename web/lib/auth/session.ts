import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./cookies";
import { tryParseAuthSession } from "./token";

export async function getSessionFromCookies() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  return tryParseAuthSession(token);
}
