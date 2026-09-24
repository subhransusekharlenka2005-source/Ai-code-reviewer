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

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_TTL_MS),
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  cookieStore.delete(COOKIE_NAME);
}

export async function destroyAllSessionsForUser(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

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
