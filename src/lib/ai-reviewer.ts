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
  const prompt = `You are an expert software engineer and rigorous code reviewer.
Analyze the user's ${language} code with extreme precision.
Detect ALL:
1. Syntax and Indentation errors (e.g. Python indentation issues in functions or blocks, missing colons, unclosed brackets/quotes).
2. Runtime and Type errors (e.g. Python TypeError when concatenating string with non-string using '+', calling non-existent methods like .push() or .length on Python lists, or .push_back() in JS).
3. Logic bugs, undefined variables, and broken control flow.
4. Security vulnerabilities and performance flaws.

CRITICAL RULES:
- For EVERY issue, provide the line number (1-based), severity ("error", "warning", or "info"), title, clear explanation, and a concrete suggestion.
- Every defect that prevents the code from running or causes an exception (such as IndentationError or TypeError) MUST be included in the 'issues' array with severity 'error'.
- Produce a fully corrected, working version of the COMPLETE code in 'fixedCode'.
- Deduct score according to issue severity (errors: -25 each, warnings: -10 each).

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

  const candidateModels = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    process.env.GEMINI_MODEL,
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemma-4-26b-a4b-it",
  ].filter(Boolean) as string[];

  // Remove duplicates
  const uniqueModels = Array.from(new Set(candidateModels));
  let lastError = "All Gemini models unavailable.";

  for (const model of uniqueModels) {
    try {
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
        lastError = data?.error?.message || `Gemini API model ${model} returned HTTP ${response.status}`;
        continue;
      }

      const text = extractText(data);
      if (!text) continue;

      let parsed: any;
      try {
        parsed = JSON.parse(text);
        return normalizeResult(parsed, code);
      } catch {
        continue;
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
      continue;
    }
  }

  throw new Error(lastError);
}

export async function aiFixCode(language: string, code: string): Promise<string> {
  const result = await aiReviewCode(language, code);
  return result.fixedCode;
}
