export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSession, attachSessionCookie } from "@/lib/auth";
import { loginOtpSchema } from "@/lib/validation";
import { hashOtp, safeEqual } from "@/lib/otp";
import {
  dbFindOtpChallenge,
  dbIncrementOtpAttempts,
  dbDeleteOtpChallenge,
  dbFindUserByIdentifier,
  dbCreateUser,
  dbMarkEmailVerified,
} from "@/lib/auth-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const { email, code } = parsed.data;
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
        { error: "Too many failed attempts. Please request a new login code." },
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

    // Invalidate challenge immediately (single-use)
    await dbDeleteOtpChallenge(email, "LOGIN");

    // Find existing user or create verified user
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
  } catch (err: any) {
    console.error("Login OTP verify error:", err);
    return NextResponse.json(
      { error: err?.message || "Verification failed." },
      { status: 500 }
    );
  }
}
