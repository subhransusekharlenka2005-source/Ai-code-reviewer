export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession, attachSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import {
  dbFindUserByIdentifier,
} from "@/lib/auth-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    // (OTP Login Flow is handled in /api/auth/otp/verify/route.ts)

    // 2. Standard Password Login Flow (Username/Email + Password)
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;
    const user = await dbFindUserByIdentifier(identifier);

    // Generic error message prevents user/account enumeration
    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email address before logging in." },
        { status: 403 }
      );
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });

    attachSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err?.message || "Login failed." },
      { status: 500 }
    );
  }
}
