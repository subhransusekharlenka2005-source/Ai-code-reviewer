export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, verifyPassword } from "@/lib/auth";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendMail, emailChangeOtpHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const newEmail = typeof body?.newEmail === "string" ? body.newEmail.trim().toLowerCase() : "";
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  if (!newEmail || !currentPassword) return NextResponse.json({ error: "New email and current password are required." }, { status: 400 });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  if (newEmail === user.email) return NextResponse.json({ error: "That is already your current email." }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  const recent = await prisma.emailChangeChallenge.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  if (recent && Date.now() - recent.createdAt.getTime() < 60_000) return NextResponse.json({ error: "Please wait 60 seconds before requesting another code." }, { status: 429 });
  await prisma.emailChangeChallenge.deleteMany({ where: { userId: user.id } });
  const code = generateOtp();
  await prisma.emailChangeChallenge.create({ data: { userId: user.id, newEmail, codeHash: hashOtp(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  try { await sendMail(newEmail, "Verify your new AI Code Reviewer email", emailChangeOtpHtml(code, newEmail)); }
  catch { return NextResponse.json({ error: "We could not send the verification email. Check SMTP settings." }, { status: 502 }); }
  return NextResponse.json({ ok: true });
}
