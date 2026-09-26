"use client";

import { useState } from "react";

interface FixedCodeViewerProps {
  fixedCode: string;
  onApply: () => void;
}

export default function FixedCodeViewer({ fixedCode, onApply }: FixedCodeViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!fixedCode) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fixedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  }

  return (
    <div className="mt-6 pt-5 border-t border-line min-w-0 max-w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="font-display font-semibold text-sm text-ink flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-good inline-block" />
          Recommended Fixed Code
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs bg-white hover:bg-paper border border-line rounded px-2.5 py-1 font-medium text-black/70 hover:text-ink transition active:scale-95"
            onClick={handleCopy}
          >
            {copied ? "✓ Copied!" : "Copy code"}
          </button>
          <button
            type="button"
            className="btn-ghost text-xs py-1 px-2.5 active:scale-95"
            onClick={onApply}
          >
            Apply to editor
          </button>
        </div>
      </div>

      <div className="relative min-w-0 max-w-full rounded-md overflow-hidden bg-ink shadow-inner">
        <pre className="text-gray-100 p-3 sm:p-4 overflow-x-auto text-xs leading-5 max-h-80 font-mono whitespace-pre min-w-0">
          {fixedCode}
        </pre>
      </div>
    </div>
  );
}
