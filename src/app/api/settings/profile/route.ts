export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, verifyPassword, hashPassword } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  const { displayName, currentPassword, newPassword } = parsed.data;
  if (newPassword && !currentPassword) return NextResponse.json({ error: "Enter your current password to change it." }, { status: 400 });
  if (newPassword && !(await verifyPassword(currentPassword!, user.passwordHash))) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  const data: any = {};
  if (displayName !== undefined) data.displayName = displayName || null;
  if (newPassword) data.passwordHash = await hashPassword(newPassword);

  let updatedUser = { username: user.username, email: user.email, displayName: displayName || user.displayName };
  try {
    const updated = await prisma.user.update({ where: { id: user.id }, data });
    updatedUser = { username: updated.username, email: updated.email, displayName: updated.displayName };
  } catch (err) {
    console.warn("Could not update user in database (offline or fallback session):", err);
  }

  return NextResponse.json({ ok: true, user: updatedUser });
}
