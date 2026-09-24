import Link from "next/link";

const LANGUAGES = ["HTML", "CSS", "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "Go", "Rust", "PHP", "SQL"];

export default function LandingPage() {
  return (
    <main>
      <section className="bg-ink text-white px-8 py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-tight mb-5 max-w-md">
              Find the bugs before your reviewers do.
            </h1>
            <p className="text-white/70 max-w-sm mb-8">
              Register for a free account, paste a snippet, and get a structured
              breakdown of correctness, security, and performance issues.
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <Link href="/reviewer" className="btn-primary bg-signal hover:bg-blue-700">Start reviewing free</Link>
              <Link href="/login" className="btn-ghost border-white/20 text-white hover:border-white/50">Log in</Link>
              <Link href="/register" className="btn-ghost border-white/20 text-white hover:border-white/50">Create account</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <span key={l} className="font-mono text-xs border border-white/20 rounded px-2 py-1 text-white/70">
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-8 py-16">
        <p className="font-mono text-sm text-black/50 mb-2">How it works</p>
        <h2 className="font-display text-2xl font-semibold mb-8">Five steps from paste to fixed.</h2>
        <ol className="grid sm:grid-cols-5 gap-6 border-t border-line pt-6">
          {["Paste your code", "Select language", "Review your code", "Fix problems", "Save your result"].map(
            (step, i) => (
              <li key={step}>
                <span className="font-mono text-signal text-sm">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-sm mt-2">{step}</p>
              </li>
            )
          )}
        </ol>
      </section>

      <section className="max-w-5xl mx-auto px-8 py-16">
        <p className="font-mono text-sm text-black/50 mb-2">FAQ</p>
        <h2 className="font-display text-2xl font-semibold mb-8">Questions</h2>
        <div className="divide-y divide-line border-t border-line">
          {[
            ["Is my code private?", "Reviews are tied to your account and only visible to you and site admins with a legitimate reason to look."],
            ["How does AI review work?", "Your code is sent to a language model with strict instructions to treat it as data to analyze, never as instructions to follow."],
            ["What languages are supported?", "HTML, CSS, JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, PHP, and SQL."],
          ].map(([q, a]) => (
            <details key={q} className="py-4">
              <summary className="font-display font-semibold cursor-pointer">{q}</summary>
              <p className="text-sm text-black/60 mt-2 max-w-md">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
