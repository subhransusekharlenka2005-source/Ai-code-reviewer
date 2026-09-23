export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { fixSchema } from "@/lib/validation";
import { aiFixCode } from "@/lib/ai-reviewer";
import { fixCode as localFixCode } from "@/lib/reviewer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = fixSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid code" }, { status: 400 });

  const requestedProvider = parsed.data.provider || "auto";

  if (requestedProvider === "local" || !process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json({ fixedCode: localFixCode(parsed.data.language, parsed.data.code), provider: "local" });
  }

  try {
    return NextResponse.json({ fixedCode: await aiFixCode(parsed.data.language, parsed.data.code), provider: "gemini" });
  } catch (error) {
    return NextResponse.json({ fixedCode: localFixCode(parsed.data.language, parsed.data.code), provider: "local" });
  }
}
