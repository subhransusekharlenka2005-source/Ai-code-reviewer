export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyOtpSchema } from "@/lib/validation";
import { hashOtp, safeEqual } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { email, code } = parsed.data;
    const challenge = await prisma.otpChallenge.findFirst({
      where: { email, purpose: "REGISTER" },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge || challenge.expiresAt <= new Date()) {
      if (challenge) await prisma.otpChallenge.delete({ where: { id: challenge.id } });
      return NextResponse.json({ error: "That code is invalid or expired. Request a new code." }, { status: 400 });
    }

    if (challenge.attempts >= 5) {
      await prisma.otpChallenge.delete({ where: { id: challenge.id } });
      return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
    }

    const valid = safeEqual(hashOtp(code), challenge.codeHash);
    if (!valid) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        username: challenge.username,
        email: challenge.email,
        passwordHash: challenge.passwordHash,
        emailVerified: true,
      },
    });

    await prisma.otpChallenge.delete({ where: { id: challenge.id } });
    await createSession(user.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Verify OTP error:", err);
    if (err?.message?.includes("Can't reach database server") || err?.code === "P1001" || err?.message?.includes("DATABASE_URL") || !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database not connected. Please set the DATABASE_URL environment variable in your hosting dashboard (e.g. Vercel)." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: err?.message || "Verification failed." },
      { status: 500 }
    );
  }
}
