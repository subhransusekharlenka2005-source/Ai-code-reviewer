export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendMail, otpEmailHtml } from "@/lib/email";

const OTP_TTL_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "We could not send the OTP email. Check the server SMTP configuration." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, email });
}
