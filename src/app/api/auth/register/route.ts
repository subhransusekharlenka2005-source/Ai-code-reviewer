export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendMail, otpEmailHtml } from "@/lib/email";

const OTP_TTL_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { username, email, password } = parsed.data;

    let dbConnected = true;
    try {
      const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });

      if (existing?.emailVerified) {
        return NextResponse.json({ error: "An account with that email or username already exists." }, { status: 409 });
      }

      if (existing && !existing.emailVerified) {
        await prisma.user.delete({ where: { id: existing.id } });
      }

      const pending = await prisma.otpChallenge.findFirst({
        where: { email, purpose: "REGISTER" },
        orderBy: { createdAt: "desc" },
      });

      if (pending && Date.now() - pending.createdAt.getTime() < 60_000) {
        return NextResponse.json({ error: "Please wait 60 seconds before requesting another code." }, { status: 429 });
      }

      await prisma.otpChallenge.deleteMany({ where: { email, purpose: "REGISTER" } });

      const code = generateOtp();
      await prisma.otpChallenge.create({
        data: {
          email,
          username,
          passwordHash: await hashPassword(password),
          codeHash: hashOtp(code),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
        },
      });

      try {
        await sendMail(email, "Your AI Code Reviewer verification code", otpEmailHtml(code));
        return NextResponse.json({ ok: true, email });
      } catch (mailError: any) {
        console.error("Failed to send OTP email:", mailError);
        return NextResponse.json({
          error: "Could not send verification email. Please check your email address and SMTP configuration.",
        }, { status: 502 });
      }
    } catch {
      dbConnected = false;
    }

    if (!dbConnected) {
      // In case database is temporarily disconnected
      return NextResponse.json({
        error: "Database is currently connecting. Please try again in a few moments.",
      }, { status: 503 });
    }
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: err?.message || "Registration failed." },
      { status: 500 }
    );
  }
}
