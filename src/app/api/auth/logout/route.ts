export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { destroySession, COOKIE_NAME } from "@/lib/auth";

function clearCookie(response: NextResponse) {
  const isSecure =
    process.env.NODE_ENV === "production" &&
    !process.env.APP_URL?.startsWith("http://localhost");

  response.cookies.set(COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function POST(req: NextRequest) {
  await destroySession();

  const accept = req.headers.get("accept") || "";
  if (accept.includes("application/json")) {
    const res = NextResponse.json({ ok: true });
    clearCookie(res);
    return res;
  }

  const response = NextResponse.redirect(new URL("/login?logged_out=1", req.url), 303);
  clearCookie(response);
  return response;
}

export async function GET(req: NextRequest) {
  await destroySession();
  const response = NextResponse.redirect(new URL("/login?logged_out=1", req.url), 303);
  clearCookie(response);
  return response;
}
