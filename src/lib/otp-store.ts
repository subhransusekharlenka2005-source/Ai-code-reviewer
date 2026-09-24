import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { hashOtp } from "./otp";

export interface StoredChallenge {
  id?: string;
  email: string;
  username: string;
  passwordHash: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}

const OTP_COOKIE_NAME = "otp_challenge_token";
const FALLBACK_SECRET = process.env.SESSION_SECRET || "ai-code-reviewer-stateless-secret-key-2026";
const OTP_TTL_MS = 10 * 60 * 1000;

function signPayload(payloadStr: string): string {
  const hmac = crypto.createHmac("sha256", FALLBACK_SECRET);
  hmac.update(payloadStr);
  return hmac.digest("hex");
}

function createSignedChallengeToken(challenge: StoredChallenge): string {
  const payload = {
    email: challenge.email,
    username: challenge.username,
    passwordHash: challenge.passwordHash,
    codeHash: challenge.codeHash,
    expiresAt: challenge.expiresAt.getTime(),
    attempts: challenge.attempts,
  };
  const jsonStr = JSON.stringify(payload);
  const b64 = Buffer.from(jsonStr).toString("base64url");
  const sig = signPayload(b64);
  return `otp.${b64}.${sig}`;
}

function verifySignedChallengeToken(token: string): StoredChallenge | null {
  if (!token || !token.startsWith("otp.")) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [, b64, sig] = parts;
  if (signPayload(b64) !== sig) return null;

  try {
    const raw = JSON.parse(Buffer.from(b64, "base64url").toString("utf-8"));
    return {
      email: raw.email,
      username: raw.username,
      passwordHash: raw.passwordHash,
      codeHash: raw.codeHash,
      expiresAt: new Date(raw.expiresAt),
      attempts: Number(raw.attempts) || 0,
    };
  } catch {
    return null;
  }
}

// In-memory challenge store (shared within the Node instance)
const memoryChallenges = ((globalThis as any).__otpChallenges =
  (globalThis as any).__otpChallenges || new Map<string, StoredChallenge>());

export async function saveChallenge(params: {
  email: string;
  username: string;
  passwordHash: string;
  code: string;
}) {
  const normEmail = params.email.toLowerCase().trim();
  const codeHash = hashOtp(params.code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const challenge: StoredChallenge = {
    email: normEmail,
    username: params.username,
    passwordHash: params.passwordHash,
    codeHash,
    expiresAt,
    attempts: 0,
  };

  // 1. Keep in memory store
  memoryChallenges.set(normEmail, challenge);

  // 2. Set signed HTTP-only cookie for serverless resilience
  try {
    const cookieStore = await cookies();
    const token = createSignedChallengeToken(challenge);
    cookieStore.set(OTP_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(OTP_TTL_MS / 1000),
    });
  } catch (cookieErr) {
    console.warn("Could not set OTP cookie:", cookieErr);
  }

  // 3. Persist to database if available
  try {
    await prisma.otpChallenge.deleteMany({
      where: { email: normEmail, purpose: "REGISTER" },
    }).catch(() => null);

    const dbRecord = await prisma.otpChallenge.create({
      data: {
        email: normEmail,
        username: params.username,
        passwordHash: params.passwordHash,
        codeHash,
        expiresAt,
      },
    });
    challenge.id = dbRecord.id;
  } catch {
    // Database offline; cookie and memory stores safely protect the challenge
  }

  return challenge;
}

export async function findChallenge(email: string): Promise<StoredChallenge | null> {
  const normEmail = email.toLowerCase().trim();

  // 1. Try database first
  try {
    const dbRecord = await prisma.otpChallenge.findFirst({
      where: { email: normEmail, purpose: "REGISTER" },
      orderBy: { createdAt: "desc" },
    });
    if (dbRecord) {
      return {
        id: dbRecord.id,
        email: dbRecord.email,
        username: dbRecord.username,
        passwordHash: dbRecord.passwordHash,
        codeHash: dbRecord.codeHash,
        expiresAt: dbRecord.expiresAt,
        attempts: dbRecord.attempts,
      };
    }
  } catch {
    // Database offline; fall back to signed cookie / memory
  }

  // 2. Check signed cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OTP_COOKIE_NAME)?.value;
    if (token) {
      const fromCookie = verifySignedChallengeToken(token);
      if (fromCookie && fromCookie.email.toLowerCase() === normEmail) {
        return fromCookie;
      }
    }
  } catch {
    // ignore
  }

  // 3. Check memory store
  const fromMemory = memoryChallenges.get(normEmail);
  return fromMemory || null;
}

export async function incrementChallengeAttempts(challenge: StoredChallenge) {
  challenge.attempts += 1;
  const normEmail = challenge.email.toLowerCase().trim();
  memoryChallenges.set(normEmail, challenge);

  try {
    const cookieStore = await cookies();
    const token = createSignedChallengeToken(challenge);
    cookieStore.set(OTP_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(OTP_TTL_MS / 1000),
    });
  } catch {
    // ignore
  }

  if (challenge.id) {
    try {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
    } catch {
      // ignore
    }
  }
}

export async function deleteChallenge(challenge: StoredChallenge) {
  const normEmail = challenge.email.toLowerCase().trim();
  memoryChallenges.delete(normEmail);

  try {
    const cookieStore = await cookies();
    cookieStore.delete(OTP_COOKIE_NAME);
  } catch {
    // ignore
  }

  if (challenge.id) {
    try {
      await prisma.otpChallenge.delete({
        where: { id: challenge.id },
      });
    } catch {
      // ignore
    }
  }
}
