import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "./db";
import { hashOtp, safeEqual } from "./otp";
import type { User } from "@prisma/client";

export interface StoredOtp {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  codeHash: string;
  purpose: string;
  expiresAt: string; // ISO
  attempts: number;
}

export interface StoredResetToken {
  id: string;
  userId: string;
  token: string;
  codeHash: string;
  expiresAt: string; // ISO
}

interface ServerAuthData {
  users: Array<{
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    passwordHash: string;
    role: "USER" | "ADMIN";
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  sessions: Array<{
    id: string;
    token: string;
    userId: string;
    expiresAt: string;
    createdAt: string;
  }>;
  otpChallenges: StoredOtp[];
  resetTokens: StoredResetToken[];
}

const DATA_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "auth-store.json");

function readServerStore(): ServerAuthData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initial: ServerAuthData = { users: [], sessions: [], otpChallenges: [], resetTokens: [] };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const content = fs.readFileSync(STORE_FILE, "utf8");
    return JSON.parse(content);
  } catch {
    return { users: [], sessions: [], otpChallenges: [], resetTokens: [] };
  }
}

function writeServerStore(data: ServerAuthData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist auth store:", err);
  }
}

// ---------------------------------------------------------------------------
// 1. USER OPERATIONS
// ---------------------------------------------------------------------------

export async function dbFindUserByIdentifier(identifier: string) {
  const norm = identifier.trim().toLowerCase();

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: norm, mode: "insensitive" } },
          { username: { equals: identifier.trim(), mode: "insensitive" } },
        ],
      },
    });
    if (user) return user;
  } catch {
    // Database connecting or offline - fallback to server store
  }

  const store = readServerStore();
  const found = store.users.find(
    (u) => u.email.toLowerCase() === norm || u.username.toLowerCase() === identifier.trim().toLowerCase()
  );
  if (!found) return null;

  return {
    ...found,
    createdAt: new Date(found.createdAt),
    updatedAt: new Date(found.updatedAt),
  } as User;
}

export async function dbFindUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) return user;
  } catch {}

  const store = readServerStore();
  const found = store.users.find((u) => u.id === id);
  if (!found) return null;

  return {
    ...found,
    createdAt: new Date(found.createdAt),
    updatedAt: new Date(found.updatedAt),
  } as User;
}

export async function dbCheckUserExists(username: string, email: string) {
  const normEmail = email.trim().toLowerCase();
  const normUser = username.trim().toLowerCase();

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normEmail, mode: "insensitive" } },
          { username: { equals: username.trim(), mode: "insensitive" } },
        ],
      },
    });
    if (existing) {
      if (existing.email.toLowerCase() === normEmail) {
        return { exists: true, field: "email", user: existing };
      }
      return { exists: true, field: "username", user: existing };
    }
  } catch {}

  const store = readServerStore();
  const emailMatch = store.users.find((u) => u.email.toLowerCase() === normEmail);
  if (emailMatch) return { exists: true, field: "email", user: emailMatch };

  const userMatch = store.users.find((u) => u.username.toLowerCase() === normUser);
  if (userMatch) return { exists: true, field: "username", user: userMatch };

  return { exists: false, field: null, user: null };
}

export async function dbCreateUser(params: {
  username: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  emailVerified?: boolean;
}) {
  const id = "usr_" + crypto.randomBytes(12).toString("hex");
  const normEmail = params.email.trim().toLowerCase();
  const username = params.username.trim();

  let user: User | null = null;
  try {
    user = await prisma.user.create({
      data: {
        id,
        username,
        email: normEmail,
        displayName: params.displayName || username,
        passwordHash: params.passwordHash,
        emailVerified: params.emailVerified ?? false,
      },
    });
  } catch {
    // Server store persistence
    user = {
      id,
      username,
      email: normEmail,
      displayName: params.displayName || username,
      passwordHash: params.passwordHash,
      role: "USER" as const,
      emailVerified: params.emailVerified ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Always sync to server store as well
  const store = readServerStore();
  const filtered = store.users.filter(
    (u) => u.id !== user!.id && u.email.toLowerCase() !== normEmail && u.username.toLowerCase() !== username.toLowerCase()
  );
  filtered.push({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
  store.users = filtered;
  writeServerStore(store);

  return user;
}

export async function dbUpdateUserPassword(userId: string, newPasswordHash: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  } catch {}

  const store = readServerStore();
  const u = store.users.find((x) => x.id === userId);
  if (u) {
    u.passwordHash = newPasswordHash;
    u.updatedAt = new Date().toISOString();
    writeServerStore(store);
  }
}

export async function dbMarkEmailVerified(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  } catch {}

  const store = readServerStore();
  const u = store.users.find((x) => x.id === userId);
  if (u) {
    u.emailVerified = true;
    u.updatedAt = new Date().toISOString();
    writeServerStore(store);
  }
}

// ---------------------------------------------------------------------------
// 2. OTP CHALLENGE OPERATIONS
// ---------------------------------------------------------------------------

export async function dbSaveOtpChallenge(params: {
  email: string;
  username: string;
  passwordHash: string;
  code: string;
  purpose?: string;
  ttlMs?: number;
}) {
  const normEmail = params.email.trim().toLowerCase();
  const purpose = params.purpose || "REGISTER";
  const codeHash = hashOtp(params.code);
  const ttl = params.ttlMs || 10 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttl);
  const id = "otp_" + crypto.randomBytes(8).toString("hex");

  // Try Prisma
  try {
    await prisma.otpChallenge.deleteMany({
      where: { email: normEmail, purpose: purpose as any },
    }).catch(() => null);

    await prisma.otpChallenge.create({
      data: {
        id,
        email: normEmail,
        username: params.username,
        passwordHash: params.passwordHash,
        codeHash,
        purpose: purpose as any,
        expiresAt,
        attempts: 0,
      },
    });
  } catch {}

  // Server store persistence
  const store = readServerStore();
  store.otpChallenges = store.otpChallenges.filter(
    (c) => !(c.email.toLowerCase() === normEmail && c.purpose === purpose)
  );
  store.otpChallenges.push({
    id,
    email: normEmail,
    username: params.username,
    passwordHash: params.passwordHash,
    codeHash,
    purpose,
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
  });
  writeServerStore(store);
}

export async function dbFindOtpChallenge(email: string, purpose = "REGISTER"): Promise<StoredOtp | null> {
  const normEmail = email.trim().toLowerCase();

  try {
    const c = await prisma.otpChallenge.findFirst({
      where: { email: normEmail, purpose: purpose as any },
      orderBy: { createdAt: "desc" },
    });
    if (c) {
      return {
        id: c.id,
        email: c.email,
        username: c.username,
        passwordHash: c.passwordHash,
        codeHash: c.codeHash,
        purpose: c.purpose,
        expiresAt: c.expiresAt.toISOString(),
        attempts: c.attempts,
      };
    }
  } catch {}

  const store = readServerStore();
  const c = store.otpChallenges.find(
    (x) => x.email.toLowerCase() === normEmail && x.purpose === purpose
  );
  return c || null;
}

export async function dbIncrementOtpAttempts(email: string, purpose = "REGISTER") {
  const normEmail = email.trim().toLowerCase();
  try {
    await prisma.otpChallenge.updateMany({
      where: { email: normEmail, purpose: purpose as any },
      data: { attempts: { increment: 1 } },
    });
  } catch {}

  const store = readServerStore();
  const c = store.otpChallenges.find(
    (x) => x.email.toLowerCase() === normEmail && x.purpose === purpose
  );
  if (c) {
    c.attempts += 1;
    writeServerStore(store);
  }
}

export async function dbDeleteOtpChallenge(email: string, purpose = "REGISTER") {
  const normEmail = email.trim().toLowerCase();
  try {
    await prisma.otpChallenge.deleteMany({
      where: { email: normEmail, purpose: purpose as any },
    });
  } catch {}

  const store = readServerStore();
  store.otpChallenges = store.otpChallenges.filter(
    (c) => !(c.email.toLowerCase() === normEmail && c.purpose === purpose)
  );
  writeServerStore(store);
}

// ---------------------------------------------------------------------------
// 3. PASSWORD RESET TOKEN OPERATIONS
// ---------------------------------------------------------------------------

export async function dbSavePasswordReset(userId: string, token: string, code: string) {
  const id = "rst_" + crypto.randomBytes(8).toString("hex");
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  try {
    await prisma.passwordResetToken.deleteMany({ where: { userId } }).catch(() => null);
    await prisma.passwordResetToken.create({
      data: {
        id,
        userId,
        token,
        expiresAt,
      },
    });
  } catch {}

  const store = readServerStore();
  store.resetTokens = store.resetTokens.filter((r) => r.userId !== userId);
  store.resetTokens.push({
    id,
    userId,
    token,
    codeHash,
    expiresAt: expiresAt.toISOString(),
  });
  writeServerStore(store);
}

export async function dbFindPasswordReset(tokenOrCode: string): Promise<StoredResetToken | null> {
  const trimmed = tokenOrCode.trim();

  // 1. Try Prisma by hex token
  try {
    const r = await prisma.passwordResetToken.findUnique({
      where: { token: trimmed },
    });
    if (r) {
      return {
        id: r.id,
        userId: r.userId,
        token: r.token,
        codeHash: "",
        expiresAt: r.expiresAt.toISOString(),
      };
    }
  } catch {}

  // 2. Try server store by token or 6-digit code hash
  const store = readServerStore();
  const hashedInput = hashOtp(trimmed);

  const found = store.resetTokens.find(
    (r) => r.token === trimmed || safeEqual(r.codeHash, hashedInput)
  );
  return found || null;
}

export async function dbDeletePasswordReset(tokenOrCode: string) {
  const trimmed = tokenOrCode.trim();
  const hashedInput = hashOtp(trimmed);

  try {
    await prisma.passwordResetToken.deleteMany({
      where: { token: trimmed },
    });
  } catch {}

  const store = readServerStore();
  store.resetTokens = store.resetTokens.filter(
    (r) => r.token !== trimmed && !safeEqual(r.codeHash, hashedInput)
  );
  writeServerStore(store);
}

export async function dbDeletePasswordResetsForUser(userId: string) {
  try {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
  } catch {}

  const store = readServerStore();
  store.resetTokens = store.resetTokens.filter((r) => r.userId !== userId);
  writeServerStore(store);
}

// ---------------------------------------------------------------------------
// 4. SESSION OPERATIONS
// ---------------------------------------------------------------------------

export async function dbCreateSession(userId: string, token: string, expiresAt: Date) {
  try {
    await prisma.session.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  } catch {}

  const store = readServerStore();
  store.sessions = store.sessions.filter((s) => s.token !== token);
  store.sessions.push({
    id: "sess_" + crypto.randomBytes(8).toString("hex"),
    token,
    userId,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  });
  writeServerStore(store);
}

export async function dbFindSession(token: string) {
  try {
    const s = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (s && s.expiresAt > new Date()) {
      return { session: s, user: s.user };
    }
  } catch {}

  const store = readServerStore();
  const s = store.sessions.find((x) => x.token === token);
  if (!s || new Date(s.expiresAt) <= new Date()) return null;

  const u = store.users.find((x) => x.id === s.userId);
  if (!u) return null;

  return {
    session: { ...s, expiresAt: new Date(s.expiresAt), createdAt: new Date(s.createdAt) },
    user: { ...u, createdAt: new Date(u.createdAt), updatedAt: new Date(u.updatedAt) } as User,
  };
}

export async function dbDeleteSession(token: string) {
  try {
    await prisma.session.deleteMany({ where: { token } });
  } catch {}

  const store = readServerStore();
  store.sessions = store.sessions.filter((s) => s.token !== token);
  writeServerStore(store);
}

export async function dbDeleteAllUserSessions(userId: string) {
  try {
    await prisma.session.deleteMany({ where: { userId } });
  } catch {}

  const store = readServerStore();
  store.sessions = store.sessions.filter((s) => s.userId !== userId);
  writeServerStore(store);
}
