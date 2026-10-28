import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-token";

// Clears a session cookie that is still validly signed but no longer usable (user
// locked or deleted). Without this, the proxy would keep bouncing between /login
// and /dashboard. Server Components can't modify cookies, so they redirect here.
export function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
