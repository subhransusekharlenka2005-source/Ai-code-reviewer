export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { forgotPasswordSchema } from "@/lib/validation";
import { generateOtp } from "@/lib/otp";
import { sendMail, passwordResetEmailHtml } from "@/lib/email";
import { dbFindUserByIdentifier, dbSavePasswordReset } from "@/lib/auth-db";

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
    const user = await dbFindUserByIdentifier(email);

    // If user exists, issue reset token and 6-digit code, and send real email
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const otpCode = generateOtp();

      // Persist reset token + code in authoritative store
      await dbSavePasswordReset(user.id, token, otpCode);

      const origin =
        process.env.APP_URL || req.nextUrl.origin || "http://localhost:3000";
      const link = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

      try {
        await sendMail(
          user.email,
          "Reset your AI Code Reviewer password",
          passwordResetEmailHtml(link, otpCode)
        );
      } catch (mailError: any) {
        console.error("SMTP forgot password email failure:", mailError?.message || mailError);
      }
    }

    // Always return generic privacy-preserving message (prevents account enumeration)
    return NextResponse.json({
      ok: true,
      message:
        "If that email address is registered, a password reset link and verification code have been sent.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: err?.message || "Could not process password reset request." },
      { status: 500 }
    );
  }
}
