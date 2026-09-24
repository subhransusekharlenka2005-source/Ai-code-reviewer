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

      // If deterministic analyzer found syntax or indentation errors, ensure they are included
      const staticCheck = reviewCode(parsed.data.language, parsed.data.code);
      if (staticCheck.issues.length > 0) {
        if (result.issues.length === 0) {
          result = staticCheck;
        } else {
          for (const staticIssue of staticCheck.issues) {
            const alreadyReported = result.issues.some(
              (i) => (i.line && staticIssue.line && i.line === staticIssue.line) ||
                     i.title.toLowerCase() === staticIssue.title.toLowerCase()
            );
            if (!alreadyReported) {
              result.issues.push(staticIssue);
              result.issueCounts[staticIssue.severity] = (result.issueCounts[staticIssue.severity] || 0) + 1;
              result.score = Math.max(0, result.score - (staticIssue.severity === "error" ? 25 : 10));
            }
          }
        }
      }
    } catch (error) {
      // Gracefully fall back so reviews NEVER fail
      provider = "local";
      result = reviewCode(parsed.data.language, parsed.data.code);
    }
  }

  let reviewId: string | undefined;
  let createdAt: string | undefined;

  if (user) {
    try {
      // Upsert user to ensure foreign key constraint succeeds in Neon/Postgres
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          username: user.username,
          email: user.email,
        },
        create: {
          id: user.id,
          username: user.username || user.email.split("@")[0],
          email: user.email,
          displayName: user.displayName || user.username,
          passwordHash: "",
          emailVerified: true,
        },
      }).catch(() => null);

      const saved = await prisma.codeReview.create({
        data: {
          userId: user.id,
          language: parsed.data.language,
          originalCode: parsed.data.code,
          reviewResult: JSON.parse(JSON.stringify({ ...result, provider })),
          fixedCode: result.fixedCode,
          score: result.score,
        },
      });
      reviewId = saved.id;
      createdAt = saved.createdAt.toISOString();
    } catch (saveError) {
      console.warn("Could not save review to database history:", saveError);
    }
  }

  return NextResponse.json({ ...result, provider, reviewId, createdAt });
}
