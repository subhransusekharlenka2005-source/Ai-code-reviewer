import crypto from "crypto";
import { prisma } from "./db";
import { dbSavePasswordReset } from "./auth-db";

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(userId: string, code?: string) {
  const token = randomToken();
  const resetCode = code || Math.floor(100000 + Math.random() * 900000).toString();
  
  await dbSavePasswordReset(userId, token, resetCode);
  return token;
}
