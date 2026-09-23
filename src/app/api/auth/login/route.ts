export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const { identifier, password } = parsed.data;
  const emailIdentifier = identifier.toLowerCase();

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: emailIdentifier }, { username: identifier }] },
  });

  // Same generic error whether the account doesn't exist or the password is
  // wrong, so login can't be used to enumerate registered accounts.
  const genericError = { error: "Incorrect username/email or password." };
  if (!user) return NextResponse.json(genericError, { status: 401 });

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return NextResponse.json(genericError, { status: 401 });

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email before logging in." },
      { status: 403 }
    );
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
