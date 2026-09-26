export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSession, attachSessionCookie } from "@/lib/auth";
import { verifyOtpSchema } from "@/lib/validation";
import { hashOtp, safeEqual } from "@/lib/otp";
import {
  dbFindOtpChallenge,
  dbIncrementOtpAttempts,
  dbDeleteOtpChallenge,
  dbCreateUser,
} from "@/lib/auth-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, code } = parsed.data;
    const challenge = await dbFindOtpChallenge(email, "REGISTER");

    if (!challenge || new Date(challenge.expiresAt) <= new Date()) {
      if (challenge) await dbDeleteOtpChallenge(email, "REGISTER");
      return NextResponse.json(
        { error: "That verification code is invalid or has expired. Please request a new code." },
        { status: 400 }
      );
    }

    if (challenge.attempts >= 5) {
      await dbDeleteOtpChallenge(email, "REGISTER");
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 429 }
      );
    }

    const valid = safeEqual(hashOtp(code), challenge.codeHash);
    if (!valid) {
      await dbIncrementOtpAttempts(email, "REGISTER");
      return NextResponse.json(
        { error: "Incorrect verification code. Please check your email and try again." },
        { status: 400 }
      );
    }

    // Single-use guarantee: Invalidate the challenge immediately
    await dbDeleteOtpChallenge(email, "REGISTER");

    // Persist verified user in authoritative database
    const user = await dbCreateUser({
      username: challenge.username,
      email: challenge.email,
      passwordHash: challenge.passwordHash,
      emailVerified: true,
    });

    // Establish authenticated session with httpOnly cookie
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
    console.error("Verify OTP error:", err);
    return NextResponse.json(
      { error: err?.message || "Verification failed." },
      { status: 500 }
    );
  }
}
