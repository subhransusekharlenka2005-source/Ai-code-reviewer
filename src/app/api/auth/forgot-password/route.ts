export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation";
import { createPasswordResetToken } from "@/lib/tokens";
import { generateOtp } from "@/lib/otp";
import { sendMail, passwordResetEmailHtml } from "@/lib/email";
import { saveChallenge } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    let user: any = null;
    try {
      user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
    } catch {
      // Database offline/connecting
    }

    // Always return a success-like message for privacy, but dispatch the email if user exists
    if (user) {
      const token = await createPasswordResetToken(user.id);
      const otpCode = generateOtp();

      // Store in resilient challenge store for 1 hour
      await saveChallenge({
        email: user.email,
        username: user.username,
        passwordHash: token,
        code: otpCode,
        purpose: "RESET_PASSWORD",
        ttlMs: 60 * 60 * 1000,
      });

      const origin = process.env.APP_URL || req.nextUrl.origin || "http://localhost:3000";
      const link = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

      try {
        await sendMail(
          user.email,
          "Reset your AI Code Reviewer password",
          passwordResetEmailHtml(link, otpCode)
        );
      } catch (mailError: any) {
        console.warn("SMTP send failed during forgot password:", mailError?.message || mailError);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "If that email is registered, a password reset link and code have been sent.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: err?.message || "Could not process password reset request." },
      { status: 500 }
    );
  }
}
