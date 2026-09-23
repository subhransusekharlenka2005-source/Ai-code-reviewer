"use client";

import type { ReviewIssue } from "@/services/reviewService";

interface IssuesListProps {
  issues: ReviewIssue[];
  activeFilter: "all" | "error" | "warning" | "info";
}

export default function IssuesList({ issues, activeFilter }: IssuesListProps) {
  const filteredIssues = issues.filter((issue) => {
    if (activeFilter === "all") return true;
    return issue.severity === activeFilter;
  });

  if (filteredIssues.length === 0) {
    return (
      <div className="card p-5 text-center text-sm text-black/50 bg-paper2/20">
        {issues.length === 0
          ? "No issues detected. Your code passed all checks!"
          : `No ${activeFilter} issues found.`}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredIssues.map((issue, i) => {
        let badgeStyle = "bg-signal/10 text-signal border-signal/30";
        if (issue.severity === "error") {
          badgeStyle = "bg-crit/10 text-crit border-crit/30";
        } else if (issue.severity === "warning") {
          badgeStyle = "bg-warn/10 text-warn border-warn/30";
        }

        return (
          <article
            key={`${issue.title}-${i}`}
            className="card p-4 bg-white border border-line hover:border-black/30 transition space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-medium text-sm text-ink">{issue.title}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {issue.line && (
                  <span className="font-mono text-[11px] bg-paper2 px-1.5 py-0.5 rounded text-black/60">
                    line {issue.line}
                  </span>
                )}
                <span className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badgeStyle}`}>
                  {issue.severity}
                </span>
              </div>
            </div>

            <p className="text-xs text-black/70 leading-relaxed">{issue.message}</p>

            <div className="bg-paper2/50 border-l-2 border-signal/80 pl-2.5 py-1 text-xs text-black/80">
              <span className="font-semibold text-signal">Suggestion: </span>
              {issue.suggestion}
            </div>
          </article>
        );
      })}
    </div>
  );
}
