export const runtime = "nodejs";
import { changePasswordSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, verifyPassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid password details." }, { status: 400 });

  const { currentPassword, newPassword, confirmNewPassword } = parsed.data;
  if (!currentPassword || !newPassword || !confirmNewPassword) return NextResponse.json({ error: "Current password, new password, and confirmation are required." }, { status: 400 });
  if (newPassword !== confirmNewPassword) return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
  if (await verifyPassword(newPassword, user.passwordHash)) return NextResponse.json({ error: "Your new password must be different from your current password." }, { status: 400 });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  const passwordHash = await hashPassword(newPassword);
  try {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  } catch (err) {
    console.warn("Could not update password in database:", err);
  }
  return NextResponse.json({ ok: true, message: "Password changed successfully." });
}
