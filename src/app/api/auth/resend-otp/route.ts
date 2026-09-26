export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { generateOtp } from "@/lib/otp";
import { sendMail, otpEmailHtml } from "@/lib/email";
import { dbFindOtpChallenge, dbSaveOtpChallenge } from "@/lib/auth-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const challenge = await dbFindOtpChallenge(email, "REGISTER");

    if (!challenge) {
      return NextResponse.json(
        { error: "No pending registration found for this email. Please register first." },
        { status: 404 }
      );
    }

    const code = generateOtp();
    await dbSaveOtpChallenge({
      email: challenge.email,
      username: challenge.username,
      passwordHash: challenge.passwordHash,
      code,
      purpose: "REGISTER",
      ttlMs: 10 * 60 * 1000,
    });

    try {
      await sendMail(
        email,
        "Your new AI Code Reviewer verification code",
        otpEmailHtml(code)
      );
    } catch (mailErr: any) {
      console.error("SMTP resend failed:", mailErr?.message || mailErr);
      return NextResponse.json(
        { error: "Could not deliver email. Please try again in a few moments." },
        { status: 502 }
      );
    }

    // Zero OTP leak in response
    return NextResponse.json({
      ok: true,
      email,
      message: "A new 6-digit verification code has been sent to your email.",
    });
  } catch (err: any) {
    console.error("Resend OTP error:", err);
    return NextResponse.json({ error: err?.message || "Could not resend code." }, { status: 500 });
  }
}
