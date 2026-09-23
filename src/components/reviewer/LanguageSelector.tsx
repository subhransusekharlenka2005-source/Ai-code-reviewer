"use client";

export const SUPPORTED_LANGUAGES = [
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C",
  "C++",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "SQL",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

interface LanguageSelectorProps {
  language: string;
  onChange: (language: string) => void;
  disabled?: boolean;
}

export default function LanguageSelector({
  language,
  onChange,
  disabled = false,
}: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-xs font-semibold text-black/60 font-mono uppercase">
        Language:
      </label>
      <select
        id="language-select"
        className="field max-w-[200px] text-sm font-medium py-1.5"
        value={language}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {SUPPORTED_LANGUAGES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}
