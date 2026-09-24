export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { generateOtp } from "@/lib/otp";
import { sendMail, otpEmailHtml } from "@/lib/email";
import { findChallenge, saveChallenge } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const challenge = await findChallenge(email, "REGISTER");

    if (!challenge) {
      return NextResponse.json({ error: "No pending registration found for this email." }, { status: 404 });
    }

    const code = generateOtp();
    await saveChallenge({
      email: challenge.email,
      username: challenge.username,
      passwordHash: challenge.passwordHash,
      code,
      purpose: "REGISTER",
    });

    let emailSent = true;
    try {
      await sendMail(email, "Your new AI Code Reviewer verification code", otpEmailHtml(code));
    } catch (mailErr: any) {
      console.warn("SMTP send failed during resend-otp:", mailErr?.message || mailErr);
      emailSent = false;
    }

    console.log("\n========================================================");
    console.log(`[RESEND OTP] New code for ${email} is: >>> ${code} <<<`);
    console.log("========================================================\n");

    return NextResponse.json({
      ok: true,
      email,
      code,
      emailSent,
      message: emailSent
        ? "A new verification code was sent to your email."
        : `New verification code generated: ${code}`,
    });
  } catch (err: any) {
    console.error("Resend OTP error:", err);
    return NextResponse.json({ error: err?.message || "Could not resend code." }, { status: 500 });
  }
}
