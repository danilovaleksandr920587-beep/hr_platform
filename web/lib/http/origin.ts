import "server-only";
import { headers } from "next/headers";

/**
 * Реальный origin за прокси: x-forwarded-proto/host, а не req.url,
 * который за nginx видит http и внутренний хост.
 */
export async function getRealOrigin(): Promise<string> {
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "lab-career.ru";
  const scheme = proto.split(",")[0].trim();
  return `${scheme}://${host}`;
}
