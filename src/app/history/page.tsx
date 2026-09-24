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
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">My Review History</h1>
          <p className="text-sm text-black/60 mt-1">
            Review past submissions, examine fixed solutions, or reload code back into the reviewer.
          </p>
        </div>
      </div>

      <HistoryViewer initialReviews={reviews} />
    </main>
  );
}
