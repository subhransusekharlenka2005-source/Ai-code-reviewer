export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reviewSchema } from "@/lib/validation";
import { aiReviewCode } from "@/lib/ai-reviewer";
import { reviewCode } from "@/lib/reviewer";

import { ollamaReviewCode } from "@/lib/free-ai-reviewer";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid code" }, { status: 400 });

  const requestedProvider = parsed.data.provider || "auto";
  let result;
  let provider: "gemini" | "local" | "ollama" = "local";

  if (requestedProvider === "local") {
    provider = "local";
    result = reviewCode(parsed.data.language, parsed.data.code);
  } else if (requestedProvider === "ollama") {
    const ollamaRes = await ollamaReviewCode(parsed.data.language, parsed.data.code, parsed.data.model);
    result = ollamaRes.result;
    provider = ollamaRes.provider;
  } else if (!process.env.GEMINI_API_KEY?.trim()) {
    provider = "local";
    result = reviewCode(parsed.data.language, parsed.data.code);
  } else {
    try {
      result = await aiReviewCode(parsed.data.language, parsed.data.code);
      provider = "gemini";
    } catch (error) {
      // Gracefully fall back so reviews NEVER fail
      provider = "local";
      result = reviewCode(parsed.data.language, parsed.data.code);
    }
  }

  if (user) {
    await prisma.codeReview.create({
      data: {
        userId: user.id,
        language: parsed.data.language,
        originalCode: parsed.data.code,
        reviewResult: JSON.parse(JSON.stringify({ ...result, provider })),
        fixedCode: result.fixedCode,
        score: result.score,
      },
    });
  }

  return NextResponse.json({ ...result, provider });
}
