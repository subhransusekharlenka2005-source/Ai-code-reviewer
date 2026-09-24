export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requestOtpSchema } from "@/lib/validation";
import { generateOtp } from "@/lib/otp";
import { sendMail, loginOtpEmailHtml } from "@/lib/email";
import { saveChallenge } from "@/lib/otp-store";

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

    // Check if user exists (or prepare fallback)
    let username = email.split("@")[0];
    try {
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (existingUser) {
        username = existingUser.username;
      }
    } catch {
      // Database offline/connecting; continue with email username
    }

    const code = generateOtp();

    await saveChallenge({
      email,
      username,
      code,
      purpose: "LOGIN",
      ttlMs: 10 * 60 * 1000,
    });

    let emailSent = true;
    try {
      await sendMail(email, "Your AI Code Reviewer login code", loginOtpEmailHtml(code));
    } catch (mailError: any) {
      console.warn("SMTP send failed during login OTP:", mailError?.message || mailError);
      emailSent = false;
    }

    return NextResponse.json({
      ok: true,
      email,
      message: "A 6-digit login code has been sent to your email.",
      code: !emailSent ? code : undefined,
    });
  } catch (err: any) {
    console.error("Login OTP send error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send login code." },
      { status: 500 }
    );
  }
}
