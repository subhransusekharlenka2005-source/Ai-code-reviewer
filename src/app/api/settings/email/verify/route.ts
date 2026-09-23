export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hashOtp, safeEqual } from "@/lib/otp";
import { verifyEmailChangeSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = verifyEmailChangeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid code" }, { status: 400 });
  const challenge = await prisma.emailChangeChallenge.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  if (!challenge || challenge.expiresAt <= new Date()) { if (challenge) await prisma.emailChangeChallenge.delete({ where: { id: challenge.id } }); return NextResponse.json({ error: "That code is invalid or expired." }, { status: 400 }); }
  if (challenge.attempts >= 5) { await prisma.emailChangeChallenge.delete({ where: { id: challenge.id } }); return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 }); }
  if (!safeEqual(hashOtp(parsed.data.code), challenge.codeHash)) { await prisma.emailChangeChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } }); return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 }); }
  const existing = await prisma.user.findUnique({ where: { email: challenge.newEmail } });
  if (existing && existing.id !== user.id) return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  await prisma.user.update({ where: { id: user.id }, data: { email: challenge.newEmail, emailVerified: true } });
  await prisma.emailChangeChallenge.delete({ where: { id: challenge.id } });
  return NextResponse.json({ ok: true, email: challenge.newEmail });
}
