import "server-only";
import { reviewCode, type ReviewResult } from "./reviewer";

const OLLAMA_HOSTS = [
  process.env.OLLAMA_URL,
  "http://host.docker.internal:11434",
  "http://localhost:11434",
  "http://127.0.0.1:11434",
].filter(Boolean) as string[];

/**
 * Reviews code using a free local Ollama AI model (e.g. qwen2.5-coder, deepseek-coder, llama3).
 * If Ollama is not currently active, it automatically falls back to the built-in analyzer.
 */
export async function ollamaReviewCode(
  language: string,
  code: string,
  model = "qwen2.5-coder"
): Promise<{ result: ReviewResult; provider: "ollama" | "local"; modelUsed: string }> {
  const prompt = `You are a senior code reviewer.
Analyze the following ${language} code for syntax, logic bugs, security vulnerabilities, performance, and best practices.
Return valid JSON only matching this schema:
{
  "summary": "concise overview of findings",
  "issues": [
    {
      "severity": "error" | "warning" | "info",
      "line": 1,
      "title": "short issue title",
      "message": "clear explanation of problem",
      "suggestion": "concrete fix recommendation"
    }
  ],
  "score": 85,
  "fixedCode": "the complete improved code"
}

LANGUAGE: ${language}
CODE:
${code}`;

  for (const host of OLLAMA_HOSTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: "json",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      if (data?.response) {
        const parsed = JSON.parse(data.response);
        return {
          result: {
            summary: parsed.summary || "Review completed via Ollama.",
            issues: Array.isArray(parsed.issues) ? parsed.issues : [],
            score: typeof parsed.score === "number" ? parsed.score : 80,
            issueImpact: Math.max(0, 100 - (parsed.score || 80)),
            issueCounts: {
              error: (parsed.issues || []).filter((i: any) => i.severity === "error").length,
              warning: (parsed.issues || []).filter((i: any) => i.severity === "warning").length,
              info: (parsed.issues || []).filter((i: any) => i.severity === "info").length,
            },
            fixedCode: parsed.fixedCode || code,
          },
          provider: "ollama",
          modelUsed: model,
        };
      }
    } catch {
      // Try next host or fall back
    }
  }

  // Fallback to built-in local engine if Ollama is not running
  const localResult = reviewCode(language, code);
  return {
    result: localResult,
    provider: "local",
    modelUsed: "built-in-analyzer",
  };
}
