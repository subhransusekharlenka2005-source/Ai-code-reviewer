"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type SerializedReview = {
  id: string;
  language: string;
  originalCode: string;
  fixedCode: string | null;
  score: number | null;
  createdAt: string;
  reviewResult?: any;
};

interface HistoryViewerProps {
  initialReviews?: SerializedReview[];
}

export default function HistoryViewer({ initialReviews = [] }: HistoryViewerProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState<SerializedReview[]>(initialReviews);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Merge server history with any client-stored history
    async function loadAllHistory() {
      let combined: SerializedReview[] = [...initialReviews];

      try {
        const res = await fetch("/api/history");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reviews) && data.reviews.length > 0) {
            combined = data.reviews;
          }
        }
      } catch {
        // ignore network error
      }

      try {
        const local = JSON.parse(localStorage.getItem("ai_code_reviews") || "[]");
        if (Array.isArray(local) && local.length > 0) {
          // Merge unique entries by ID or created timestamp
          const existingIds = new Set(combined.map((r) => r.id));
          for (const item of local) {
            if (!existingIds.has(item.id)) {
              combined.push(item);
              existingIds.add(item.id);
            }
          }
        }
      } catch {
        // ignore local storage error
      }

      // Sort newest first
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(combined);
    }

    loadAllHistory();
  }, [initialReviews]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleReopen(review: SerializedReview) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("saved_code", review.originalCode);
      sessionStorage.setItem("saved_language", review.language);
      router.push("/reviewer");
    }
  }

  async function handleClearHistory() {
    if (!confirm("Are you sure you want to clear your review history?")) return;
    setLoading(true);

    try {
      await fetch("/api/history", { method: "DELETE" });
    } catch {
      // ignore
    }

    try {
      localStorage.removeItem("ai_code_reviews");
    } catch {
      // ignore
    }

    setReviews([]);
    setLoading(false);
  }

  if (reviews.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="font-semibold text-base mb-1">No reviews found</p>
        <p className="text-sm text-black/60 mb-6">
          Submit code in the reviewer to analyze, fix errors, and track your review history here.
        </p>
        <button
          onClick={() => router.push("/reviewer")}
          className="btn-primary"
        >
          Open Code Reviewer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-mono text-black/50">
          Showing {reviews.length} saved review{reviews.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={handleClearHistory}
          disabled={loading}
          className="text-xs text-crit hover:underline font-medium"
        >
          Clear History
        </button>
      </div>

      <div className="space-y-3">
        {reviews.map((r) => {
          const isExpanded = expandedId === r.id;
          const dateStr = new Date(r.createdAt).toLocaleString();

          let scoreBadgeClass = "bg-good/10 text-good border-good/30";
          if (r.score !== null && r.score < 50) {
            scoreBadgeClass = "bg-crit/10 text-crit border-crit/30";
          } else if (r.score !== null && r.score < 80) {
            scoreBadgeClass = "bg-warn/10 text-warn border-warn/30";
          }

          return (
            <div
              key={r.id}
              className="card bg-white border border-line overflow-hidden transition hover:border-black/30"
            >
              {/* Header / Summary Row */}
              <div
                onClick={() => toggleExpand(r.id)}
                className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-paper2/20 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold bg-paper2 text-ink rounded px-2.5 py-1">
                    {r.language}
                  </span>
                  <span className="text-xs text-black/60">{dateStr}</span>
                </div>

                <div className="flex items-center gap-3">
                  {r.score !== null && (
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${scoreBadgeClass}`}
                    >
                      Score: {r.score}/100
                    </span>
                  )}
                  <span className="text-xs font-semibold text-signal hover:underline">
                    {isExpanded ? "Hide details ▲" : "View details ▼"}
                  </span>
                </div>
              </div>

              {/* Expandable Code & Review Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-line/60 bg-paper2/10 space-y-4">
                  {/* Original Code Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-semibold uppercase text-black/60">
                        Original Submitted Code
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReopen(r)}
                        className="text-xs text-signal font-semibold hover:underline"
                      >
                        Load into Reviewer →
                      </button>
                    </div>
                    <pre className="bg-paper2/50 border border-line rounded p-3 text-xs font-mono overflow-auto max-h-48 leading-5">
                      {r.originalCode}
                    </pre>
                  </div>

                  {/* Fixed Code Preview (if present) */}
                  {r.fixedCode && (
                    <div>
                      <span className="text-xs font-mono font-semibold uppercase text-good block mb-1.5">
                        Fixed Code Solution
                      </span>
                      <pre className="bg-ink text-gray-200 rounded p-3 text-xs font-mono overflow-auto max-h-48 leading-5">
                        {r.fixedCode}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
