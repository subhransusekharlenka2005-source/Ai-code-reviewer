"use client";

import { useState } from "react";
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
  reviews: SerializedReview[];
}

export default function HistoryViewer({ reviews }: HistoryViewerProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  if (reviews.length === 0) {
    return (
      <div className="card p-8 text-center text-black/60 text-sm">
        No reviews yet. Your completed code reviews will appear here.
      </div>
    );
  }

  return (
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
  );
}
