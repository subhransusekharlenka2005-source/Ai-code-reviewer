export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session_token";

export async function GET(req: NextRequest) {
  await destroySession();
  const response = NextResponse.redirect(new URL("/login?logged_out=1", req.url), 303);
  response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0, expires: new Date(0) });
  return response;
}

export async function POST(req: NextRequest) {
  await destroySession();
  const response = NextResponse.redirect(new URL("/login?logged_out=1", req.url), 303);
  response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0, expires: new Date(0) });
  return response;
}
