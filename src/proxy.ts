// Optimistic route guard: only checks the session cookie signature. The real
// authorization check (user exists, is active, role) happens in src/lib/auth.ts.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

const PUBLIC_PATHS = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (session && (isPublic || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals, API routes and static assets (sounds, demo video, MediaPipe files).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sounds|demo|mediapipe).*)"],
};
