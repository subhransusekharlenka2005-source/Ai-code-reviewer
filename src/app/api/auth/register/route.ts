export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { generateOtp } from "@/lib/otp";
import { sendMail, otpEmailHtml } from "@/lib/email";
import { dbCheckUserExists, dbSaveOtpChallenge } from "@/lib/auth-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { username, email, password } = parsed.data;

    // Check if username or email already exists in authoritative database
    const existing = await dbCheckUserExists(username, email);
    if (existing.exists && existing.user?.emailVerified) {
      if (existing.field === "email") {
        return NextResponse.json(
          { error: "An account with this email address already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "This username is already taken. Please choose another." },
        { status: 409 }
      );
    }

    const code = generateOtp();
    const passwordHash = await hashPassword(password);

    // Save pending challenge with 10-minute expiry (single-use, hashed)
    await dbSaveOtpChallenge({
      email,
      username,
      passwordHash,
      code,
      purpose: "REGISTER",
      ttlMs: 10 * 60 * 1000,
    });

    // Send verification code via authoritative SMTP engine
    try {
      await sendMail(
        email,
        "Your AI Code Reviewer verification code",
        otpEmailHtml(code)
      );
    } catch (mailError: any) {
      console.error("SMTP delivery failure:", mailError?.message || mailError);
      return NextResponse.json(
        {
          error:
            "Could not deliver verification email. Please verify your email address or try again shortly.",
        },
        { status: 502 }
      );
    }

    // Never return the OTP code or secret in the response
    return NextResponse.json({
      ok: true,
      email,
      message: "A 6-digit verification code has been sent to your email address.",
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: err?.message || "Registration failed." },
      { status: 500 }
    );
  }
}
