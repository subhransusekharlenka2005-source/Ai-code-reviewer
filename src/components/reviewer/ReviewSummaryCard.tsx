"use client";

interface ReviewSummaryCardProps {
  score: number | null;
  issueImpact: number | null;
  issueCounts: { error: number; warning: number; info: number };
  activeFilter: "all" | "error" | "warning" | "info";
  onFilterChange: (filter: "all" | "error" | "warning" | "info") => void;
  provider?: "gemini" | "local" | "ollama" | string;
}

export default function ReviewSummaryCard({
  score,
  issueImpact,
  issueCounts,
  activeFilter,
  onFilterChange,
  provider,
}: ReviewSummaryCardProps) {
  if (score === null) return null;

  const totalIssues = issueCounts.error + issueCounts.warning + issueCounts.info;

  // Determine score color theme
  let scoreColorClass = "text-good";
  let scoreBarClass = "bg-good";
  let scoreBadgeText = "High Quality";
  let scoreBadgeBg = "bg-good/10 text-good border-good/30";

  if (score < 50) {
    scoreColorClass = "text-crit";
    scoreBarClass = "bg-crit";
    scoreBadgeText = "Critical Issues";
    scoreBadgeBg = "bg-crit/10 text-crit border-crit/30";
  } else if (score < 80) {
    scoreColorClass = "text-warn";
    scoreBarClass = "bg-warn";
    scoreBadgeText = "Needs Attention";
    scoreBadgeBg = "bg-warn/10 text-warn border-warn/30";
  }

  return (
    <div className="card p-4 bg-paper2/30 mb-4 border border-line">
      {/* Score Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-black/50">
            Quality Assessment
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-3xl font-bold ${scoreColorClass}`}>
              {score}
            </span>
            <span className="text-black/50 text-sm font-mono">/ 100</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${scoreBadgeBg}`}>
            {scoreBadgeText}
          </span>
          {provider && (
            <span className="text-[11px] font-mono text-black/40">
              Engine: {provider === "gemini" ? "Google Gemini AI" : provider === "ollama" ? "Ollama Local AI" : "Local Analyzer"}
            </span>
          )}
        </div>
      </div>

      {/* Score Progress Bar */}
      <div className="w-full bg-paper2 h-2 rounded-full overflow-hidden mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${scoreBarClass}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>

      {issueImpact !== null && (
        <p className="text-xs text-black/60 mb-4">
          Estimated known-issue impact: <b className="font-mono">{issueImpact}%</b>
        </p>
      )}

      {/* Filter Tabs by Severity */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={`p-2 rounded-md text-center border transition ${
            activeFilter === "all"
              ? "bg-white border-signal shadow-sm font-semibold text-ink"
              : "bg-white/60 border-line hover:border-black/40 text-black/70"
          }`}
        >
          <div className="text-[11px] font-mono text-black/50">All</div>
          <div className="font-mono text-base font-bold">{totalIssues}</div>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("error")}
          className={`p-2 rounded-md text-center border transition ${
            activeFilter === "error"
              ? "bg-white border-crit shadow-sm font-semibold text-crit"
              : "bg-white/60 border-line hover:border-crit/50 text-black/70"
          }`}
        >
          <div className="text-[11px] font-mono text-crit">Errors</div>
          <div className="font-mono text-base font-bold text-crit">{issueCounts.error}</div>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("warning")}
          className={`p-2 rounded-md text-center border transition ${
            activeFilter === "warning"
              ? "bg-white border-warn shadow-sm font-semibold text-warn"
              : "bg-white/60 border-line hover:border-warn/50 text-black/70"
          }`}
        >
          <div className="text-[11px] font-mono text-warn">Warnings</div>
          <div className="font-mono text-base font-bold text-warn">{issueCounts.warning}</div>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("info")}
          className={`p-2 rounded-md text-center border transition ${
            activeFilter === "info"
              ? "bg-white border-signal shadow-sm font-semibold text-signal"
              : "bg-white/60 border-line hover:border-signal/50 text-black/70"
          }`}
        >
          <div className="text-[11px] font-mono text-signal">Info</div>
          <div className="font-mono text-base font-bold text-signal">{issueCounts.info}</div>
        </button>
      </div>
    </div>
  );
}
