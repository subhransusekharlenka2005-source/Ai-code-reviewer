import {
  dbSaveOtpChallenge,
  dbFindOtpChallenge,
  dbIncrementOtpAttempts,
  dbDeleteOtpChallenge,
  type StoredOtp,
} from "./auth-db";

export interface StoredChallenge {
  id?: string;
  email: string;
  username: string;
  passwordHash: string;
  codeHash: string;
  purpose?: string;
  expiresAt: Date;
  attempts: number;
}

export async function saveChallenge(params: {
  email: string;
  username?: string;
  passwordHash?: string;
  code: string;
  purpose?: string;
  ttlMs?: number;
}) {
  await dbSaveOtpChallenge({
    email: params.email,
    username: params.username || params.email.split("@")[0],
    passwordHash: params.passwordHash || "",
    code: params.code,
    purpose: params.purpose || "REGISTER",
    ttlMs: params.ttlMs,
  });
}

export async function findChallenge(
  email: string,
  purpose = "REGISTER"
): Promise<StoredChallenge | null> {
  const c = await dbFindOtpChallenge(email, purpose);
  if (!c) return null;
  return {
    id: c.id,
    email: c.email,
    username: c.username,
    passwordHash: c.passwordHash,
    codeHash: c.codeHash,
    purpose: c.purpose,
    expiresAt: new Date(c.expiresAt),
    attempts: c.attempts,
  };
}

export async function incrementChallengeAttempts(challenge: StoredChallenge | { email: string; purpose?: string }) {
  await dbIncrementOtpAttempts(challenge.email, challenge.purpose || "REGISTER");
}

export async function deleteChallenge(challenge: StoredChallenge | { email: string; purpose?: string }) {
  await dbDeleteOtpChallenge(challenge.email, challenge.purpose || "REGISTER");
}
