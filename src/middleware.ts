import { NextRequest, NextResponse } from "next/server";

// This middleware runs on the Edge runtime, where we can cheaply check
// "is there a session cookie at all" and redirect anonymous visitors before
// a page even renders. It intentionally does NOT touch the database (Edge
// can't reach Postgres directly) — it is a UX shortcut, not the security
// boundary. The real check is requireUser()/requireAdmin() in lib/auth.ts,
// which every protected Server Component calls and which does validate the
// session against the database. Never remove those calls on the assumption
// that this middleware is enough by itself.

const PROTECTED_PREFIXES = ["/dashboard", "/history", "/profile", "/settings", "/admin"];

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session_token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const hasValidCookie = Boolean(token && token.trim().length > 0);
  if (!hasValidCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/history/:path*", "/profile/:path*", "/settings/:path*", "/admin/:path*"],
};
