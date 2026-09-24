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

    const challenge = await findChallenge(email);

    if (!challenge) return NextResponse.json({ error: "No pending registration found." }, { status: 404 });

    const code = generateOtp();
    await saveChallenge({
      email: challenge.email,
      username: challenge.username,
      passwordHash: challenge.passwordHash,
      code,
    });

    try {
      await sendMail(email, "Your new AI Code Reviewer verification code", otpEmailHtml(code));
    } catch {
      return NextResponse.json({ error: "We could not send the OTP email. Check the server SMTP configuration." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Resend OTP error:", err);
    return NextResponse.json({ error: err?.message || "Could not resend code." }, { status: 500 });
  }
}
