export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, destroyAllSessionsForUser } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validation";
import { hashOtp, safeEqual } from "@/lib/otp";
import { findChallenge, findChallengeByCode, deleteChallenge } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { token, password, email } = parsed.data;

    let targetUserId: string | null = null;
    let tokenRecordId: string | null = null;
    let matchedChallenge: any = null;

    // 1. Check if token matches a database passwordResetToken
    try {
      const record = await prisma.passwordResetToken.findUnique({
        where: { token },
      });
      if (record) {
        if (record.expiresAt < new Date()) {
          await prisma.passwordResetToken.delete({ where: { token } }).catch(() => null);
          return NextResponse.json(
            { error: "This reset link has expired. Please request a new one." },
            { status: 400 }
          );
        }
        targetUserId = record.userId;
        tokenRecordId = record.id;
      }
    } catch {
      // Database offline/connecting; fallback to challenge store
    }

    // 2. If not found by DB token, check if it's a 6-digit OTP code or stored challenge
    if (!targetUserId) {
      if (email) {
        const challenge = await findChallenge(email, "RESET_PASSWORD");
        if (challenge && challenge.expiresAt > new Date()) {
          const isTokenMatch = challenge.passwordHash === token;
          const isCodeMatch = safeEqual(hashOtp(token), challenge.codeHash);
          if (isTokenMatch || isCodeMatch) {
            matchedChallenge = challenge;
          }
        }
      }

      if (!matchedChallenge) {
        matchedChallenge = await findChallengeByCode(token, "RESET_PASSWORD");
      }

      if (matchedChallenge) {
        try {
          const user = await prisma.user.findFirst({
            where: { email: { equals: matchedChallenge.email, mode: "insensitive" } },
          });
          if (user) {
            targetUserId = user.id;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "This reset link or OTP code is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Update password
    const passwordHash = await hashPassword(password);
    try {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { passwordHash },
      });
    } catch {
      // ignore if db offline
    }

    // Clean up reset token and challenge
    if (tokenRecordId) {
      await prisma.passwordResetToken.deleteMany({ where: { token } }).catch(() => null);
    }
    if (matchedChallenge) {
      await deleteChallenge(matchedChallenge);
    }

    // Invalidate all existing sessions
    await destroyAllSessionsForUser(targetUserId);

    return NextResponse.json({
      ok: true,
      message: "Your password has been successfully reset. You can now log in.",
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: err?.message || "Password reset failed." },
      { status: 500 }
    );
  }
}
