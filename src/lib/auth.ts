// Data Access Layer for authentication. Every page, Server Action and Route Handler
// that needs the user goes through here, so authorization is always checked against
// the database (a deactivated user is locked out even if their cookie is still valid).
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserById, type User } from "./users";
import { SESSION_COOKIE, SESSION_TTL_SEC, signSession, verifySession } from "./session-token";

export async function createSession(user: Pick<User, "id" | "role">) {
  const token = await signSession({ userId: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in, active user, or null. Memoized per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = findUserById(session.userId);
  return user && user.active ? user : null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  // Go through the sign-out route so a stale cookie gets cleared on the way to /login.
  if (!user) redirect("/api/auth/signout");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
