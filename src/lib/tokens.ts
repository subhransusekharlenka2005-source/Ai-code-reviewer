import crypto from "crypto";
import { prisma } from "./db";

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(userId: string) {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  const token = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return token;
}
