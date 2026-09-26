"use client";

export type ModelOption = {
  id: string;
  name: string;
  provider: "local" | "ollama" | "gemini" | "auto";
  badge: string;
  badgeColor: string;
  description: string;
};

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "built-in-local",
    name: "Built-in Analyzer",
    provider: "local",
    badge: "100% Free & Unlimited",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: "Instant analysis with zero rate limits, no API key required, runs offline.",
  },
  {
    id: "ollama-local",
    name: "Ollama (Qwen 2.5 Coder / Llama 3)",
    provider: "ollama",
    badge: "Free & Unlimited Local LLM",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    description: "Runs open-source coding models on your computer with unlimited reviews.",
  },
  {
    id: "gemini-flash",
    name: "Google Gemini 3.8 Flash",
    provider: "gemini",
    badge: "Cloud AI (Free Tier)",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    description: "Google Gemini API with automatic fallback to local engine if quota is exceeded.",
  },
  {
    id: "auto-smart",
    name: "Auto-Detect Engine",
    provider: "auto",
    badge: "Recommended",
    badgeColor: "bg-gray-100 text-gray-800 border-gray-300",
    description: "Uses cloud AI when configured, seamlessly falls back to free local analyzer.",
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onChange: (modelId: string, provider: "local" | "ollama" | "gemini" | "auto") => void;
  disabled?: boolean;
}

export default function ModelSelector({
  selectedModel,
  onChange,
  disabled = false,
}: ModelSelectorProps) {
  const current = MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
      <label htmlFor="model-select" className="text-xs font-semibold text-black/60 font-mono uppercase shrink-0">
        Review Model:
      </label>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <select
          id="model-select"
          className="field text-sm font-medium py-1.5 w-full sm:w-[240px]"
          value={selectedModel}
          onChange={(e) => {
            const opt = MODEL_OPTIONS.find((m) => m.id === e.target.value) || MODEL_OPTIONS[0];
            onChange(opt.id, opt.provider);
          }}
          disabled={disabled}
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.badge}
            </option>
          ))}
        </select>
        <span
          className={`hidden lg:inline-block text-[11px] font-mono px-2 py-0.5 rounded border whitespace-nowrap ${current.badgeColor}`}
        >
          {current.badge}
        </span>
      </div>
    </div>
  );
}
