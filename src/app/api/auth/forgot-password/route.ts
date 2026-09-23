export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation";
import { createPasswordResetToken } from "@/lib/tokens";
import { sendMail, passwordResetEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Always the same response, whether or not the email is registered — this
  // prevents the endpoint from being used to check who has an account.
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const link = `${process.env.APP_URL || req.nextUrl.origin}/reset-password?token=${token}`;
    await sendMail(user.email, "Reset your password", passwordResetEmailHtml(link));
  }

  return NextResponse.json({
    ok: true,
    message: "If that email is registered, a reset link is on its way.",
  });
}
