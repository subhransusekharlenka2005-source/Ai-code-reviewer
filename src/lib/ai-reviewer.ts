import "server-only";

export type AIReviewIssue = {
  severity: "error" | "warning" | "info";
  line?: number;
  title: string;
  message: string;
  suggestion: string;
};

export type AIReviewResult = {
  summary: string;
  issues: AIReviewIssue[];
  score: number;
  issueImpact: number;
  issueCounts: { error: number; warning: number; info: number };
  fixedCode: string;
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function normalizeResult(raw: any, originalCode: string): AIReviewResult {
  const issues: AIReviewIssue[] = Array.isArray(raw?.issues)
    ? raw.issues
        .map((x: any) => ({
          severity: x?.severity === "error" || x?.severity === "warning" ? x.severity : "info",
          line: Number.isInteger(x?.line) && x.line > 0 ? x.line : undefined,
          title: String(x?.title || "Code issue"),
          message: String(x?.message || "Potential issue detected."),
          suggestion: String(x?.suggestion || "Review this code path."),
        }))
        .slice(0, 100)
    : [];

  const counts = {
    error: issues.filter((x) => x.severity === "error").length,
    warning: issues.filter((x) => x.severity === "warning").length,
    info: issues.filter((x) => x.severity === "info").length,
  };

  const score = Math.max(0, Math.min(100, Number.isFinite(raw?.score) ? Math.round(raw.score) : Math.max(0, 100 - counts.error * 20 - counts.warning * 7)));
  const fixedCode = typeof raw?.fixedCode === "string" && raw.fixedCode.trim() ? raw.fixedCode : originalCode;

  return {
    summary: String(raw?.summary || (issues.length ? `${issues.length} issue(s) detected.` : "No significant issues were detected.")),
    issues,
    score,
    issueImpact: Math.max(0, 100 - score),
    issueCounts: counts,
    fixedCode,
  };
}

function extractText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) return parts.map((p: any) => p?.text || "").join("");
  return "";
}

export async function aiReviewCode(language: string, code: string): Promise<AIReviewResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  const prompt = `You are an expert software engineer and code reviewer.
Analyze the user's ${language} code deeply. Detect syntax errors, runtime errors, type errors, logic bugs, incorrect API usage, security problems, performance problems, bad error handling, and important maintainability issues. Do not invent issues. Use the supplied language only.

For every real issue, provide the best available line number (1-based), severity, title, clear explanation, and a concrete correction suggestion.
Then produce a corrected version of the COMPLETE code. Preserve the user's intended behavior and do not remove working functionality just to silence a warning. If the code is already correct, return the original code unchanged.

Return JSON only using the requested schema.

LANGUAGE:
${language}

CODE:
${code}`;

  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            severity: { type: "string", enum: ["error", "warning", "info"] },
            line: { type: "integer", minimum: 1 },
            title: { type: "string" },
            message: { type: "string" },
            suggestion: { type: "string" },
          },
          required: ["severity", "title", "message", "suggestion"],
        },
      },
      score: { type: "integer", minimum: 0, maximum: 100 },
      fixedCode: { type: "string" },
    },
    required: ["summary", "issues", "score", "fixedCode"],
  };

  const response = await fetch(`${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.error?.message || `Gemini API returned HTTP ${response.status}`;
    throw new Error(detail);
  }

  const text = extractText(data);
  if (!text) throw new Error("Gemini returned an empty response.");

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid structured output.");
  }

  return normalizeResult(parsed, code);
}

export async function aiFixCode(language: string, code: string): Promise<string> {
  const result = await aiReviewCode(language, code);
  return result.fixedCode;
}
