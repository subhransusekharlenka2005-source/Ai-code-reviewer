export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendMail, otpEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const challenge = await prisma.otpChallenge.findFirst({
    where: { email, purpose: "REGISTER" },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) return NextResponse.json({ error: "No pending registration found." }, { status: 404 });
  if (Date.now() - challenge.createdAt.getTime() < 60_000) {
    return NextResponse.json({ error: "Please wait 60 seconds before requesting another code." }, { status: 429 });
  }

  const code = generateOtp();
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: {
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    },
  });

  try {
    await sendMail(email, "Your new AI Code Reviewer verification code", otpEmailHtml(code));
  } catch {
    return NextResponse.json({ error: "We could not send the OTP email. Check the server SMTP configuration." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
