import Link from "next/link";

const LANGUAGES = [
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
];

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      {/* Hero Section */}
      <section className="bg-ink text-white px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column (Hero Content) */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-mono mb-4 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-good animate-pulse" />
              <span>Multi-Model AI Code Reviewer</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight mb-5">
              Find bugs before your reviewers do.
            </h1>

            <p className="text-white/70 text-sm sm:text-base max-w-lg mb-8 leading-relaxed">
              Instant AI code inspection across 13+ languages. Detect syntax errors, security vulnerabilities,
              runtime exceptions, and get automated, production-ready code fixes.
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
              <Link
                href="/reviewer"
                className="btn-primary bg-signal hover:bg-blue-700 text-white shadow-lg shadow-signal/30 text-sm px-5 py-2.5"
              >
                Start reviewing free →
              </Link>
              <Link
                href="/login"
                className="btn-ghost border-white/20 text-white hover:border-white/50 text-sm px-4 py-2.5"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="btn-ghost border-white/20 text-white hover:border-white/50 text-sm px-4 py-2.5"
              >
                Create account
              </Link>
            </div>

            {/* Languages Badges */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {LANGUAGES.map((l) => (
                <span
                  key={l}
                  className="font-mono text-[11px] sm:text-xs border border-white/15 rounded px-2 py-0.5 text-white/70 bg-white/5"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column (Live Preview Terminal Mockup) */}
          <div className="lg:col-span-5 min-w-0 max-w-full">
            <div className="card bg-gray-900 border border-white/15 rounded-xl shadow-2xl overflow-hidden text-xs font-mono">
              {/* Terminal Window Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-crit/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-warn/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-good/80 inline-block" />
                </div>
                <span className="text-white/50 text-[11px]">reviewer.py — Inspection</span>
                <span className="text-good font-semibold text-[11px] bg-good/20 px-2 py-0.5 rounded">
                  Score: 92/100
                </span>
              </div>

              {/* Code Snippet Box */}
              <div className="p-4 bg-gray-950/80 text-gray-300 space-y-1.5 overflow-x-auto whitespace-pre">
                <div className="text-white/40">// Analyzed Python snippet</div>
                <div><span className="text-purple-400">def</span> <span className="text-blue-400">process_payment</span>(amount, user_id):</div>
                <div className="pl-4"><span className="text-purple-400">if</span> amount &lt;= <span className="text-emerald-400">0</span>:</div>
                <div className="pl-8"><span className="text-purple-400">raise</span> <span className="text-yellow-400">ValueError</span>(<span className="text-emerald-300">"Invalid amount"</span>)</div>
                <div className="pl-4"><span className="text-purple-400">return</span> db.charge(user_id, amount)</div>
              </div>

              {/* Findings Callout */}
              <div className="p-3.5 bg-gray-900/90 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/80 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-good" />
                    1 Issue Resolved
                  </span>
                  <span className="text-good">Fixed</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Added input validation guard against non-positive transaction amounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <p className="font-mono text-xs sm:text-sm text-black/50 mb-2">How it works</p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-8 text-ink">
          Five steps from paste to fixed.
        </h2>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 border-t border-line pt-6">
          {[
            { step: "Paste your code", desc: "Drop any snippet into the editor or load a language example." },
            { step: "Select language", desc: "Choose from 13+ supported languages and AI models." },
            { step: "Review your code", desc: "Get an instant quality score and line-by-line inspection breakdown." },
            { step: "Fix problems", desc: "Apply recommended one-click fixes directly into your editor." },
            { step: "Save your result", desc: "Keep review history tied to your account for future reference." },
          ].map((item, i) => (
            <li key={item.step} className="card p-4 bg-white/70">
              <span className="font-mono text-signal text-sm font-bold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="font-semibold text-sm mt-2 text-ink">{item.step}</p>
              <p className="text-xs text-black/60 mt-1 leading-relaxed">{item.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <p className="font-mono text-xs sm:text-sm text-black/50 mb-2">FAQ</p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-8 text-ink">
          Frequently Asked Questions
        </h2>

        <div className="divide-y divide-line border-t border-line">
          {[
            [
              "Is my code private?",
              "Reviews are tied to your personal account and only visible to you. We do not use your proprietary code for training models.",
            ],
            [
              "How does AI review work?",
              "Your code is analyzed by multi-model AI (Google Gemini or local engine) with strict engineering rules to detect syntax errors, runtime exceptions, security flaws, and performance anti-patterns.",
            ],
            [
              "What languages are supported?",
              "HTML, CSS, JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, PHP, and SQL.",
            ],
            [
              "Can I run it completely offline or without API limits?",
              "Yes. The built-in local analyzer and Ollama engine allow 100% offline, free, and unlimited reviews directly from your device.",
            ],
          ].map(([q, a]) => (
            <details key={q} className="py-4 group">
              <summary className="font-display font-semibold cursor-pointer text-sm sm:text-base text-ink flex items-center justify-between">
                <span>{q}</span>
                <span className="text-black/40 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-xs sm:text-sm text-black/70 mt-2 max-w-2xl leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
