import { SignJWT, jwtVerify } from "jose";
import { isAuthSecretConfigured } from "./config";

export type AuthSession = {
  id: string;
  email: string;
  displayName: string;
};

function secretKey() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
}

export async function signAuthToken(session: AuthSession): Promise<string> {
  return new SignJWT({
    email: session.email,
    name: session.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function tryParseAuthSession(token: string | undefined): Promise<AuthSession | null> {
  if (!token || !isAuthSecretConfigured()) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const id = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const displayName = typeof payload.name === "string" ? payload.name : "";
    if (!id || !email) return null;
    return { id, email, displayName };
  } catch {
    return null;
  }
}
