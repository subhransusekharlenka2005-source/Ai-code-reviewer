"use client";

import { useEffect, useState, useMemo } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("ALL");
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

  // Unique languages for filter dropdown
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const r of reviews) {
      if (r.language) langs.add(r.language);
    }
    return Array.from(langs).sort();
  }, [reviews]);

  // Filtered reviews based on search query & language
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesLang = languageFilter === "ALL" || r.language.toLowerCase() === languageFilter.toLowerCase();
      if (!matchesLang) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.language.toLowerCase().includes(q) ||
        r.originalCode.toLowerCase().includes(q) ||
        (r.fixedCode && r.fixedCode.toLowerCase().includes(q))
      );
    });
  }, [reviews, languageFilter, searchQuery]);

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

  async function handleDeleteSingle(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this review from your history?")) return;

    try {
      await fetch(`/api/history?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      // ignore
    }

    try {
      const stored = JSON.parse(localStorage.getItem("ai_code_reviews") || "[]");
      const updated = stored.filter((x: any) => x.id !== id);
      localStorage.setItem("ai_code_reviews", JSON.stringify(updated));
    } catch {
      // ignore
    }

    setReviews((prev) => prev.filter((r) => r.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function handleClearHistory() {
    if (!confirm("Are you sure you want to clear your entire review history?")) return;
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
      <div className="card p-8 sm:p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-signal/10 text-signal flex items-center justify-center mx-auto mb-4 font-mono font-bold text-lg">
          &lt;/&gt;
        </div>
        <p className="font-semibold text-lg mb-2 text-ink">No reviews saved yet</p>
        <p className="text-sm text-black/60 mb-6 leading-relaxed">
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
      {/* Search & Filter Control Bar */}
      <div className="card p-3 sm:p-4 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code snippets or languages..."
            className="field text-xs sm:text-sm py-1.5 flex-1 min-w-0"
          />

          {availableLanguages.length > 1 && (
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="field text-xs sm:text-sm py-1.5 w-auto max-w-[140px]"
            >
              <option value="ALL">All Languages</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/50">
          <span className="text-xs font-mono text-black/50">
            {filteredReviews.length} {filteredReviews.length === 1 ? "review" : "reviews"}
          </span>
          <button
            onClick={handleClearHistory}
            disabled={loading}
            className="text-xs text-crit hover:underline font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <div className="card p-8 text-center text-sm text-black/50 bg-paper2/30">
          No reviews match your search or filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((r) => {
            const isExpanded = expandedId === r.id;
            const dateStr = new Date(r.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            });

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
                  className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none bg-white hover:bg-paper2/20 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs font-semibold bg-paper2 text-ink rounded px-2.5 py-1 shrink-0">
                      {r.language}
                    </span>
                    <span className="text-xs text-black/60 truncate">{dateStr}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {r.score !== null && (
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${scoreBadgeClass}`}
                      >
                        Score: {r.score}/100
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-signal hover:underline">
                        {isExpanded ? "Hide details ▲" : "View details ▼"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingle(r.id, e)}
                        title="Delete this review"
                        className="text-xs text-black/30 hover:text-crit transition p-1"
                        aria-label="Delete review"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Code & Review Details */}
                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-4 pt-2 border-t border-line/60 bg-paper2/10 space-y-4 min-w-0 max-w-full">
                    {/* Original Code Preview */}
                    <div className="min-w-0 max-w-full">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
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
                      <div className="relative min-w-0 max-w-full rounded bg-paper2/60 border border-line overflow-hidden">
                        <pre className="p-3 text-xs font-mono overflow-x-auto whitespace-pre max-h-56 leading-5 min-w-0 text-ink">
                          {r.originalCode}
                        </pre>
                      </div>
                    </div>

                    {/* Fixed Code Preview (if present) */}
                    {r.fixedCode && (
                      <div className="min-w-0 max-w-full">
                        <span className="text-xs font-mono font-semibold uppercase text-good block mb-1.5">
                          Fixed Code Solution
                        </span>
                        <div className="relative min-w-0 max-w-full rounded bg-ink overflow-hidden">
                          <pre className="text-gray-200 p-3 text-xs font-mono overflow-x-auto whitespace-pre max-h-56 leading-5 min-w-0">
                            {r.fixedCode}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
