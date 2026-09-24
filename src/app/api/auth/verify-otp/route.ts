export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyOtpSchema } from "@/lib/validation";
import { hashOtp, safeEqual } from "@/lib/otp";
import { findChallenge, incrementChallengeAttempts, deleteChallenge } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { email, code } = parsed.data;
    const challenge = await findChallenge(email);

    if (!challenge || challenge.expiresAt <= new Date()) {
      if (challenge) await deleteChallenge(challenge);
      return NextResponse.json({ error: "That code is invalid or expired. Request a new code." }, { status: 400 });
    }

    if (challenge.attempts >= 5) {
      await deleteChallenge(challenge);
      return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
    }

    const valid = safeEqual(hashOtp(code), challenge.codeHash);
    if (!valid) {
      await incrementChallengeAttempts(challenge);
      return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
    }

    // Create user in database if connected; otherwise create fallback user object
    let createdUser: any = null;
    try {
      createdUser = await prisma.user.create({
        data: {
          username: challenge.username,
          email: challenge.email,
          passwordHash: challenge.passwordHash,
          emailVerified: true,
        },
      });
    } catch {
      // Database unavailable (e.g. running on Vercel without cloud DB configured)
      createdUser = {
        id: "usr-" + crypto.randomBytes(8).toString("hex"),
        username: challenge.username,
        email: challenge.email,
        displayName: challenge.username,
        role: "USER" as const,
        emailVerified: true,
      };
    }

    await deleteChallenge(challenge);
    await createSession(createdUser.id, createdUser);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Verify OTP error:", err);
    return NextResponse.json(
      { error: err?.message || "Verification failed." },
      { status: 500 }
    );
  }
}
