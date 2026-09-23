export type ReviewIssue = {
  severity: "error" | "warning" | "info";
  line?: number;
  title: string;
  message: string;
  suggestion: string;
};

export type ReviewResult = {
  summary: string;
  issues: ReviewIssue[];
  score: number;
  issueImpact: number;
  issueCounts: { error: number; warning: number; info: number };
  fixedCode: string;
  provider?: "gemini" | "local" | "ollama";
};

export type ReviewResponse = {
  data?: ReviewResult;
  error?: string;
};

export type FixResponse = {
  fixedCode?: string;
  provider?: "gemini" | "local" | "ollama";
  error?: string;
};

/**
 * Requests an AI code review from the backend API.
 */
export async function reviewCodeApi(
  language: string,
  code: string,
  options?: { provider?: string; model?: string }
): Promise<ReviewResponse> {
  try {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        code,
        provider: options?.provider,
        model: options?.model,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return { error: data?.error || `Review failed with status ${res.status}.` };
    }

    return {
      data: {
        summary: data.summary || "Review completed.",
        issues: Array.isArray(data.issues) ? data.issues : [],
        score: typeof data.score === "number" ? data.score : 0,
        issueImpact: data.issueImpact ?? Math.max(0, 100 - (data.score || 0)),
        issueCounts: data.issueCounts ?? { error: 0, warning: 0, info: 0 },
        fixedCode: data.fixedCode || code,
        provider: data.provider,
      },
    };
  } catch (err: any) {
    return { error: err?.message || "Could not connect to the review server." };
  }
}

/**
 * Requests an automated code fix from the backend API.
 */
export async function fixCodeApi(
  language: string,
  code: string,
  options?: { provider?: string; model?: string }
): Promise<FixResponse> {
  try {
    const res = await fetch("/api/fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        code,
        provider: options?.provider,
        model: options?.model,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return { error: data?.error || `Fix failed with status ${res.status}.` };
    }

    return {
      fixedCode: data.fixedCode || code,
      provider: data.provider,
    };
  } catch (err: any) {
    return { error: err?.message || "Could not connect to the fix server." };
  }
}
