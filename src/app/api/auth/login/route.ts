export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema, loginOtpSchema } from "@/lib/validation";
import { hashOtp, safeEqual } from "@/lib/otp";
import { findChallenge, incrementChallengeAttempts, deleteChallenge } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    // 1. Check if this is an OTP login request (email + code)
    if (body?.email && body?.code) {
      const parsedOtp = loginOtpSchema.safeParse(body);
      if (!parsedOtp.success) {
        return NextResponse.json(
          { error: parsedOtp.error.issues[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }
      const { email, code } = parsedOtp.data;
      const challenge = await findChallenge(email, "LOGIN");

      if (!challenge || challenge.expiresAt <= new Date()) {
        if (challenge) await deleteChallenge(challenge);
        return NextResponse.json(
          { error: "The login code is invalid or has expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (challenge.attempts >= 5) {
        await deleteChallenge(challenge);
        return NextResponse.json(
          { error: "Too many failed attempts. Please request a new code." },
          { status: 429 }
        );
      }

      const valid = safeEqual(hashOtp(code), challenge.codeHash);
      if (!valid) {
        await incrementChallengeAttempts(challenge);
        return NextResponse.json(
          { error: "Incorrect verification code. Please check your email and try again." },
          { status: 400 }
        );
      }

      let user: any = null;
      try {
        user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              username: challenge.username || email.split("@")[0],
              email: challenge.email,
              passwordHash: "",
              emailVerified: true,
            },
          });
        } else if (!user.emailVerified) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          });
        }
      } catch {
        user = {
          id: "usr-" + crypto.randomBytes(8).toString("hex"),
          username: challenge.username || email.split("@")[0],
          email: challenge.email,
          displayName: challenge.username || email.split("@")[0],
          role: "USER" as const,
          emailVerified: true,
        };
      }

      await deleteChallenge(challenge);
      await createSession(user.id, user);
      return NextResponse.json({ ok: true, user });
    }

    // 2. Standard username/email + password login
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { identifier, password } = parsed.data;
    const emailIdentifier = identifier.toLowerCase();

    let user: any = null;
    let dbConnected = true;

    try {
      user = await prisma.user.findFirst({
        where: { OR: [{ email: emailIdentifier }, { username: identifier }] },
      });
    } catch {
      dbConnected = false;
    }

    if (dbConnected && user) {
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return NextResponse.json({ error: "Incorrect username/email or password." }, { status: 401 });

      if (!user.emailVerified) {
        return NextResponse.json(
          { error: "Please verify your email before logging in." },
          { status: 403 }
        );
      }

      await createSession(user.id, user);
      return NextResponse.json({ ok: true });
    }

    if (!dbConnected) {
      // Fallback for hosting environments without Postgres
      const fallbackUser = {
        id: "usr-" + Buffer.from(identifier).toString("hex").slice(0, 12),
        username: identifier.includes("@") ? identifier.split("@")[0] : identifier,
        email: identifier.includes("@") ? identifier : `${identifier}@example.com`,
        displayName: identifier.includes("@") ? identifier.split("@")[0] : identifier,
        role: "USER" as const,
      };
      await createSession(fallbackUser.id, fallbackUser);
      return NextResponse.json({ ok: true });
    }

    // Generic error
    return NextResponse.json({ error: "Incorrect username/email or password." }, { status: 401 });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err?.message || "Login failed." },
      { status: 500 }
    );
  }
}
