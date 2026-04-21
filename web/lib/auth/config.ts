export function isAuthSecretConfigured(): boolean {
  const s = process.env.AUTH_SECRET ?? "";
  return s.length >= 32;
}

export function isPasswordAuthConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() && isAuthSecretConfigured());
}
