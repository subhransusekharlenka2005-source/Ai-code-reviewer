import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import type { User } from "@prisma/client";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session_token";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

const FALLBACK_SECRET = process.env.SESSION_SECRET || "ai-code-reviewer-stateless-secret-key-2026";

function signPayload(payloadStr: string): string {
  const hmac = crypto.createHmac("sha256", FALLBACK_SECRET);
  hmac.update(payloadStr);
  return hmac.digest("hex");
}

export function createStatelessSessionToken(user: Partial<User>): string {
  const payload = {
    id: user.id || "guest-" + Date.now(),
    username: user.username || "Developer",
    email: user.email || "developer@example.com",
    displayName: user.displayName || user.username || "Developer",
    role: user.role || "USER",
    exp: Date.now() + SESSION_TTL_MS,
  };
  const jsonStr = JSON.stringify(payload);
  const b64 = Buffer.from(jsonStr).toString("base64url");
  const sig = signPayload(b64);
  return `stateless.${b64}.${sig}`;
}

export function verifyStatelessSessionToken(token: string): User | null {
  if (!token.startsWith("stateless.")) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [, b64, sig] = parts;
  if (signPayload(b64) !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf-8"));
    if (payload.exp && payload.exp < Date.now()) return null;
    return {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      displayName: payload.displayName,
      passwordHash: "",
      role: payload.role as any,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, fallbackUser?: Partial<User>) {
  let token = crypto.randomBytes(32).toString("hex");

  try {
    await prisma.session.create({
      data: { token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
  } catch {
    // Database unavailable (e.g. running on Vercel without cloud DB configured)
    token = createStatelessSessionToken(fallbackUser || { id: userId });
  }

  const isSecure =
    process.env.NODE_ENV === "production" &&
    !process.env.APP_URL?.startsWith("http://localhost");

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_TTL_MS),
  });
}

export async function destroySession() {
  try {
    const isSecure =
      process.env.NODE_ENV === "production" &&
      !process.env.APP_URL?.startsWith("http://localhost");

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token && !token.startsWith("stateless.")) {
      await prisma.session.deleteMany({ where: { token } }).catch(() => null);
    }
    cookieStore.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    cookieStore.delete(COOKIE_NAME);
  } catch (err) {
    console.error("Error destroying session:", err);
  }
}

export async function destroyAllSessionsForUser(userId: string) {
  try {
    await prisma.session.deleteMany({ where: { userId } }).catch(() => null);
  } catch (err) {
    console.error("Error destroying user sessions:", err);
  }
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  if (token.startsWith("stateless.")) {
    return verifyStatelessSessionToken(token);
  }

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
      }
      return null;
    }

    return session.user;
  } catch (err) {
    console.error("Database error in getSessionUser:", err);
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
