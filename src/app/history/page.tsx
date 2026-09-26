import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import HistoryViewer, { type SerializedReview } from "@/components/history/HistoryViewer";

export default async function HistoryPage() {
  const user = await getSessionUser();

  let reviews: SerializedReview[] = [];

  if (user) {
    try {
      const rawReviews = await prisma.codeReview.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      reviews = rawReviews.map((r) => ({
        id: r.id,
        language: r.language,
        originalCode: r.originalCode,
        fixedCode: r.fixedCode,
        score: r.score,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch (err) {
      console.warn("Could not query database reviews:", err);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">My Review History</h1>
        <p className="text-xs sm:text-sm text-black/60 mt-1">
          Review past submissions, examine fixed solutions, or reload code back into the reviewer.
        </p>
      </div>

      <HistoryViewer initialReviews={reviews} />
    </main>
  );
}
