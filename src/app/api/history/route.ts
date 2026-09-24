export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: true, reviews: [] });
    }

    try {
      const dbReviews = await prisma.codeReview.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const reviews = dbReviews.map((r) => ({
        id: r.id,
        language: r.language,
        originalCode: r.originalCode,
        fixedCode: r.fixedCode,
        score: r.score,
        reviewResult: r.reviewResult,
        createdAt: r.createdAt.toISOString(),
      }));

      return NextResponse.json({ ok: true, reviews });
    } catch (dbErr) {
      console.warn("Could not query database reviews:", dbErr);
      return NextResponse.json({ ok: true, reviews: [] });
    }
  } catch (err: any) {
    console.error("History fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch review history." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get("id");

    try {
      if (reviewId) {
        await prisma.codeReview.deleteMany({
          where: { id: reviewId, userId: user.id },
        });
      } else {
        await prisma.codeReview.deleteMany({
          where: { userId: user.id },
        });
      }
      return NextResponse.json({ ok: true });
    } catch (dbErr) {
      console.warn("Could not delete reviews in database:", dbErr);
      return NextResponse.json({ ok: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete history." }, { status: 500 });
  }
}
