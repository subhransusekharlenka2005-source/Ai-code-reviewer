export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
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
    } catch {
      await prisma.otpChallenge.deleteMany({ where: { email, purpose: "REGISTER" } });
      return NextResponse.json({ error: "Could not send verification email. Check your SMTP configuration in hosting settings." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, email });
  } catch (err: any) {
    console.error("Registration error:", err);
    if (err?.message?.includes("Can't reach database server") || err?.code === "P1001" || err?.message?.includes("DATABASE_URL") || !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database not connected. Please set the DATABASE_URL environment variable in your hosting dashboard (e.g. Vercel)." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: err?.message || "Registration failed. Please check server configuration." },
      { status: 500 }
    );
  }
}
