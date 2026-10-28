// JWT helpers shared by the proxy and server code. No `server-only` / `next/headers`
// imports here so the proxy can use it too.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "sc_session";
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = { userId: number; role: "admin" | "member" };

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "number") return null;
    return { userId: payload.userId, role: payload.role === "admin" ? "admin" : "member" };
  } catch {
    return null;
  }
}
