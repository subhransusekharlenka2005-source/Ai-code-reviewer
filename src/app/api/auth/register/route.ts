export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { generateOtp } from "@/lib/otp";
import { sendMail, otpEmailHtml } from "@/lib/email";
import { saveChallenge } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { username, email, password } = parsed.data;

    // Check if account already exists in database (if database is connected)
    try {
      const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
      if (existing?.emailVerified) {
        return NextResponse.json({ error: "An account with that email or username already exists." }, { status: 409 });
      }
      if (existing && !existing.emailVerified) {
        await prisma.user.delete({ where: { id: existing.id } }).catch(() => null);
      }
    } catch {
      // Database offline or serverless fallback - continue smoothly
    }

    const code = generateOtp();
    const passwordHash = await hashPassword(password);

    await saveChallenge({
      email,
      username,
      passwordHash,
      code,
    });

    let emailSent = true;
    try {
      await sendMail(email, "Your AI Code Reviewer verification code", otpEmailHtml(code));
    } catch (mailError: any) {
      console.warn("SMTP delivery attempt failed (local/network block):", mailError?.message || mailError);
      emailSent = false;
    }

    return NextResponse.json({
      ok: true,
      email,
      code: !emailSent ? code : undefined,
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: err?.message || "Registration failed." },
      { status: 500 }
    );
  }
}
