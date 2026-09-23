"use client";

import { useMemo } from "react";

export const CODE_SAMPLES: Record<string, string> = {
  HTML: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sample Web Page</title>
</head>
<body>
  <center>
    <h1>Welcome to Our Product</h1>
  </center>

  <!-- Missing alt attribute for screen reader accessibility -->
  <img src="banner.jpg">

  <!-- Insecure target="_blank" without rel="noopener noreferrer" -->
  <a href="https://external-resource.example.com" target="_blank">
    Visit Partner Site
  </a>

  <!-- Inline event handler violates Content Security Policy -->
  <button onclick="alert('clicked')">Submit Feedback</button>
</body>
</html>`,

  CSS: `/* Sample CSS Stylesheet */
.header {
  font-family: Arial, sans-serif;
  color: #333333;
}

#sidebar {
  width: 250px;
  display: flex;
}

/* Overly specific selector with !important */
div.container > div.row > div.col-md-6 > p.text-muted {
  font-size: 14px !important;
  color: #666 !important;
  margin-bottom: 20px !important;
}`,

  JavaScript: `function authenticateUser(token) {
  // Console logging in production code
  console.log("Validating token: " + token);

  if (token == null) {
    return false;
  }

  // Security risk: eval usage
  return eval("token.isValid");
}`,

  TypeScript: `function processRequest(payload: any): any {
  console.log("Incoming payload:", payload);

  // Explicit any removes type safety
  const data: any = payload;
  return eval(data.expression);
}`,

  Python: `import os

def process_user_data(user_input):
    # Security risk: eval execution
    result = eval(user_input)

    # Bad practice: bare except
    try:
        data = int(result)
    except:
        return None

    return data`,

  Java: `public class Example {
    public static void main(String[] args) {
        // TODO: implement input sanitization before production
        System.out.println("Processing data...");
    }
}`,

  SQL: `-- Unoptimized query fetching all columns
SELECT * FROM users
WHERE email = 'user@example.com';`,
};

interface CodeEditorProps {
  language: string;
  code: string;
  onChange: (code: string) => void;
  onReview: () => void;
  onFix: () => void;
  loading: boolean;
}

export default function CodeEditor({
  language,
  code,
  onChange,
  onReview,
  onFix,
  loading,
}: CodeEditorProps) {
  const lineCount = useMemo(() => {
    return code ? code.split("\n").length : 1;
  }, [code]);

  function loadSample() {
    const sample = CODE_SAMPLES[language] || CODE_SAMPLES.HTML;
    onChange(sample);
  }

  function handleClear() {
    onChange("");
  }

  return (
    <section className="card flex flex-col overflow-hidden bg-white">
      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-paper2/50 border-b border-line">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-sm text-ink">Code Editor</h2>
          <span className="font-mono text-xs text-black/50 bg-paper2 px-2 py-0.5 rounded">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSample}
            disabled={loading}
            className="text-xs bg-white hover:bg-paper border border-line rounded px-2.5 py-1 font-medium text-black/70 hover:text-ink transition"
          >
            Load {language} Example
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={loading || !code}
            className="text-xs text-black/40 hover:text-crit transition px-1.5 py-1"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className="relative flex flex-1 min-h-[460px] font-mono text-sm leading-6">
        {/* Line Numbers Gutter */}
        <div
          aria-hidden="true"
          className="w-12 bg-paper2/30 text-black/30 select-none py-3 pr-2 text-right border-r border-line/60 font-mono text-xs overflow-hidden"
        >
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Textarea */}
        <textarea
          className="flex-1 p-3 font-mono text-sm text-ink bg-transparent resize-none outline-none leading-6"
          spellCheck={false}
          value={code}
          placeholder={`Paste your ${language} code here, or click "Load ${language} Example" above...`}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Editor Action Buttons Footer */}
      <div className="p-3 bg-paper2/40 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-black/50 font-mono">
          {code.length} characters
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={onFix}
            disabled={loading || !code.trim()}
          >
            {loading ? "Working…" : "Fix with AI"}
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            onClick={onReview}
            disabled={loading || !code.trim()}
          >
            {loading ? "Analyzing code…" : "Review with AI"}
          </button>
        </div>
      </div>
    </section>
  );
}
