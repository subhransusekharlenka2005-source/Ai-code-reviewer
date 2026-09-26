import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  dbCreateSession,
  dbFindSession,
  dbDeleteSession,
  dbDeleteAllUserSessions,
} from "./auth-db";
import type { User } from "@prisma/client";

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session_token";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function getSessionCookieOptions(expiresAt: Date) {
  const isSecure =
    process.env.NODE_ENV === "production" &&
    !process.env.APP_URL?.startsWith("http://localhost");

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export function attachSessionCookie(response: { cookies: { set: Function } }, token: string, expiresAt: Date) {
  response.cookies.set(COOKIE_NAME, token, getSessionCookieOptions(expiresAt));
  return response;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, _fallbackUser?: Partial<User>) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // Authoritative server-side session persistence
  await dbCreateSession(userId, token, expiresAt);

  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, getSessionCookieOptions(expiresAt));
  } catch {}

  return { token, expiresAt };
}

export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      await dbDeleteSession(token);
    }

    const isSecure =
      process.env.NODE_ENV === "production" &&
      !process.env.APP_URL?.startsWith("http://localhost");

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
    await dbDeleteAllUserSessions(userId);
  } catch (err) {
    console.error("Error destroying user sessions:", err);
  }
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const result = await dbFindSession(token);
    if (!result || !result.user) {
      // Invalid or expired token - clear stale cookie
      return null;
    }

    return result.user;
  } catch (err: any) {
    if (err?.digest === "DYNAMIC_SERVER_USAGE" || err?.digest?.includes("DYNAMIC")) {
      throw err;
    }
    console.error("Error in getSessionUser:", err);
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
