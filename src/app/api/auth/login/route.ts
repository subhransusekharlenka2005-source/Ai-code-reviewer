export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession, attachSessionCookie } from "@/lib/auth";
import { loginSchema, loginOtpSchema } from "@/lib/validation";
import { hashOtp, safeEqual } from "@/lib/otp";
import {
  dbFindUserByIdentifier,
  dbFindOtpChallenge,
  dbIncrementOtpAttempts,
  dbDeleteOtpChallenge,
  dbCreateUser,
  dbMarkEmailVerified,
} from "@/lib/auth-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    // 1. OTP Login Flow (Email + 6-digit Code)
    if (body?.email && body?.code) {
      const parsedOtp = loginOtpSchema.safeParse(body);
      if (!parsedOtp.success) {
        return NextResponse.json(
          { error: parsedOtp.error.issues[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }
      const { email, code } = parsedOtp.data;
      const challenge = await dbFindOtpChallenge(email, "LOGIN");

      if (!challenge || new Date(challenge.expiresAt) <= new Date()) {
        if (challenge) await dbDeleteOtpChallenge(email, "LOGIN");
        return NextResponse.json(
          { error: "The login code is invalid or has expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (challenge.attempts >= 5) {
        await dbDeleteOtpChallenge(email, "LOGIN");
        return NextResponse.json(
          { error: "Too many failed attempts. Please request a new code." },
          { status: 429 }
        );
      }

      const valid = safeEqual(hashOtp(code), challenge.codeHash);
      if (!valid) {
        await dbIncrementOtpAttempts(email, "LOGIN");
        return NextResponse.json(
          { error: "Incorrect verification code. Please check your email and try again." },
          { status: 400 }
        );
      }

      // Single-use: delete challenge
      await dbDeleteOtpChallenge(email, "LOGIN");

      // Find or create user
      let user = await dbFindUserByIdentifier(email);
      if (!user) {
        user = await dbCreateUser({
          username: challenge.username || email.split("@")[0],
          email: challenge.email,
          passwordHash: "",
          emailVerified: true,
        });
      } else if (!user.emailVerified) {
        await dbMarkEmailVerified(user.id);
        user.emailVerified = true;
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
    }

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
