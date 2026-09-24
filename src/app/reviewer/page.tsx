"use client";

import { useState } from "react";
import Link from "next/link";
import {
  reviewCodeApi,
  fixCodeApi,
  type ReviewIssue,
} from "@/services/reviewService";
import LanguageSelector from "@/components/reviewer/LanguageSelector";
import ModelSelector from "@/components/reviewer/ModelSelector";
import CodeEditor from "@/components/reviewer/CodeEditor";
import ReviewSummaryCard from "@/components/reviewer/ReviewSummaryCard";
import IssuesList from "@/components/reviewer/IssuesList";
import FixedCodeViewer from "@/components/reviewer/FixedCodeViewer";

export default function ReviewerPage() {
  const [language, setLanguage] = useState("HTML");
  const [selectedModelId, setSelectedModelId] = useState("gemini-flash");
  const [selectedProvider, setSelectedProvider] = useState<"local" | "ollama" | "gemini" | "auto">("auto");
  const [code, setCode] = useState("");
  const [fixedCode, setFixedCode] = useState("");
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const [summary, setSummary] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [issueImpact, setIssueImpact] = useState<number | null>(null);
  const [issueCounts, setIssueCounts] = useState({ error: 0, warning: 0, info: 0 });
  const [provider, setProvider] = useState<"gemini" | "local" | "ollama" | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<"all" | "error" | "warning" | "info">("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReview() {
    if (!code.trim()) return;
    setError("");
    setLoading(true);

    const res = await reviewCodeApi(language, code, {
      provider: selectedProvider,
      model: selectedModelId === "ollama-local" ? "qwen2.5-coder" : undefined,
    });
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.data) {
      setIssues(res.data.issues);
      setSummary(res.data.summary);
      setScore(res.data.score);
      setIssueImpact(res.data.issueImpact);
      setIssueCounts(res.data.issueCounts);
      setFixedCode(res.data.fixedCode);
      setProvider(res.data.provider);
      setActiveFilter("all");

      // Save to client history store so user never loses their history
      try {
        const stored = JSON.parse(localStorage.getItem("ai_code_reviews") || "[]");
        const entry = {
          id: (res.data as any).reviewId || "rev-" + Date.now(),
          language,
          originalCode: code,
          fixedCode: res.data.fixedCode,
          score: res.data.score,
          createdAt: (res.data as any).createdAt || new Date().toISOString(),
        };
        const updated = [entry, ...stored.filter((x: any) => x.id !== entry.id)].slice(0, 50);
        localStorage.setItem("ai_code_reviews", JSON.stringify(updated));
      } catch {
        // ignore storage error
      }
    }
  }

  async function handleFix() {
    if (!code.trim()) return;
    setError("");
    setLoading(true);

    const res = await fixCodeApi(language, code, {
      provider: selectedProvider,
      model: selectedModelId === "ollama-local" ? "qwen2.5-coder" : undefined,
    });
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.fixedCode) {
      setFixedCode(res.fixedCode);
      setCode(res.fixedCode);
      // Re-review the newly fixed code to show improved score
      const reviewRes = await reviewCodeApi(language, res.fixedCode, {
        provider: selectedProvider,
        model: selectedModelId === "ollama-local" ? "qwen2.5-coder" : undefined,
      });
      if (reviewRes.data) {
        setIssues(reviewRes.data.issues);
        setSummary(reviewRes.data.summary);
        setScore(reviewRes.data.score);
        setIssueImpact(reviewRes.data.issueImpact);
        setIssueCounts(reviewRes.data.issueCounts);
      }
    }
  }

  function handleApplyFixedCode() {
    if (fixedCode) {
      setCode(fixedCode);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      {/* Top Header */}
      <div className="mb-6">
        <p className="font-mono text-sm text-black/50">Multi-Model & Multi-Language Reviewer</p>
        <h1 className="font-display text-3xl font-semibold">Review and fix your code</h1>
      </div>

      {/* Control Bar: Language & Free Model Selectors */}
      <div className="card p-4 bg-white mb-6 flex flex-wrap items-center justify-between gap-4">
        <LanguageSelector
          language={language}
          onChange={(newLang) => {
            setLanguage(newLang);
            setError("");
          }}
          disabled={loading}
        />

        <ModelSelector
          selectedModel={selectedModelId}
          onChange={(modelId, prov) => {
            setSelectedModelId(modelId);
            setSelectedProvider(prov);
            setError("");
          }}
          disabled={loading}
        />
      </div>

      {/* Main Two-Column Workspace */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left Column: Code Editor Component */}
        <CodeEditor
          language={language}
          code={code}
          onChange={setCode}
          onReview={handleReview}
          onFix={handleFix}
          loading={loading}
        />

        {/* Right Column: Review Findings Component */}
        <section className="card p-5 bg-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-semibold text-lg text-ink">Inspection Findings</h2>
              {issues.length > 0 && (
                <span className="font-mono text-xs text-black/50">
                  {issues.length} {issues.length === 1 ? "issue" : "issues"} detected
                </span>
              )}
            </div>

            {/* Error Message with Login Link if Unauthorized */}
            {error && (
              <div className="p-3 mb-4 rounded-md bg-crit/10 border border-crit/20 text-crit text-sm">
                <p>{error}</p>
                {error.toLowerCase().includes("logged in") && (
                  <Link href="/login" className="font-semibold underline mt-1 inline-block">
                    Click here to log in →
                  </Link>
                )}
              </div>
            )}

            {/* Summary Text */}
            {summary ? (
              <p className="text-sm mb-4 text-black/80 font-medium leading-relaxed bg-paper2/40 p-3 rounded-md border border-line">
                {summary}
              </p>
            ) : (
              <div className="text-sm text-black/50 mb-4 bg-paper2/20 p-4 rounded-md border border-dashed border-line text-center">
                Paste your code or load an example on the left, then click <b>Review with AI</b>.
              </div>
            )}

            {/* Quality Score & Severity Breakdown Card */}
            <ReviewSummaryCard
              score={score}
              issueImpact={issueImpact}
              issueCounts={issueCounts}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              provider={provider}
            />

            {/* Detailed Issues List Component */}
            {score !== null && (
              <IssuesList issues={issues} activeFilter={activeFilter} />
            )}
          </div>

          {/* Fixed Code Viewer Component */}
          {fixedCode && (
            <FixedCodeViewer
              fixedCode={fixedCode}
              onApply={handleApplyFixedCode}
            />
          )}
        </section>
      </div>

      <p className="text-xs text-black/50 mt-5 leading-normal">
        The review engine analyzes code for syntax errors, accessibility, security vulnerabilities, performance bottlenecks, and modern standards. AI and local fixes should be reviewed before production deployment.
      </p>
    </main>
  );
}
