export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { hashPassword, destroyAllSessionsForUser } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validation";
import {
  dbFindPasswordReset,
  dbDeletePasswordResetsForUser,
  dbUpdateUserPassword,
  dbMarkEmailVerified,
} from "@/lib/auth-db";

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
    const { token, password } = parsed.data;

    // Look up token or 6-digit code in authoritative store
    const resetRecord = await dbFindPasswordReset(token);

    if (!resetRecord || new Date(resetRecord.expiresAt) <= new Date()) {
      if (resetRecord) {
        await dbDeletePasswordResetsForUser(resetRecord.userId);
      }
      return NextResponse.json(
        { error: "This password reset link or code is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Update password hash
    const passwordHash = await hashPassword(password);
    await dbUpdateUserPassword(resetRecord.userId, passwordHash);
    await dbMarkEmailVerified(resetRecord.userId);

    // Single-use guarantee: Invalidate all reset tokens for this user
    await dbDeletePasswordResetsForUser(resetRecord.userId);

    // Security best practice: Invalidate any existing active sessions
    await destroyAllSessionsForUser(resetRecord.userId);

    return NextResponse.json({
      ok: true,
      message: "Your password has been reset successfully. Please log in with your new password.",
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: err?.message || "Password reset failed." },
      { status: 500 }
    );
  }
}
