export function multiParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const v = sp[key];
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export function optionalInt(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): number | null {
  const raw = sp[key];
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s == null || s === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function optionalString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const raw = sp[key];
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s ?? "";
}
