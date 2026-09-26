export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requestOtpSchema } from "@/lib/validation";
import { generateOtp } from "@/lib/otp";
import { sendMail, loginOtpEmailHtml } from "@/lib/email";
import { dbFindUserByIdentifier, dbSaveOtpChallenge } from "@/lib/auth-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = requestOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    let username = email.split("@")[0];
    const existingUser = await dbFindUserByIdentifier(email);
    if (existingUser) {
      username = existingUser.username;
    }

    const code = generateOtp();

    await dbSaveOtpChallenge({
      email,
      username,
      passwordHash: existingUser?.passwordHash || "",
      code,
      purpose: "LOGIN",
      ttlMs: 10 * 60 * 1000,
    });

    try {
      await sendMail(
        email,
        "Your AI Code Reviewer login code",
        loginOtpEmailHtml(code)
      );
    } catch (mailError: any) {
      console.error("SMTP login OTP failure:", mailError?.message || mailError);
      return NextResponse.json(
        { error: "Could not deliver login code to your email. Please try again in a moment." },
        { status: 502 }
      );
    }

    // Zero OTP leak in response
    return NextResponse.json({
      ok: true,
      email,
      message: "A 6-digit login code has been sent to your email address.",
    });
  } catch (err: any) {
    console.error("Login OTP send error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send login code." },
      { status: 500 }
    );
  }
}
