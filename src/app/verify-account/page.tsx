"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyOtpApi, resendOtpApi } from "@/services/authService";

function VerifyAccountForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialEmail = params.get("email") || "";
  const justSent = params.get("sent") === "1";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    justSent && initialEmail
      ? `A 6-digit verification code was sent to ${initialEmail}. Please check your email inbox.`
      : null
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    const res = await verifyOtpApi(email.trim(), code.trim());
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Verification failed. Check your code and try again.");
      return;
    }

    // Successfully verified and session created. Redirect to dashboard.
    router.push("/dashboard");
    router.refresh();
  }

  async function resend() {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Please provide your email address to resend the code.");
      return;
    }

    setResending(true);
    const res = await resendOtpApi(email.trim());
    setResending(false);

    if (!res.ok) {
      setError(res.error || "Could not resend verification code.");
    } else {
      setMessage(res.message || "A new 6-digit verification code was sent to your email.");
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16">
      <h1 className="font-display text-2xl font-semibold mb-6 text-ink">Verify your email</h1>
      <form onSubmit={verify} className="card p-4 sm:p-6 space-y-4 bg-white shadow-sm border border-line">
        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-sm text-emerald-800 dark:text-emerald-300">
            ✓ {message}
          </div>
        )}

        <div>
          <label className="label">Email address</label>
          <input
            className="field"
            type="email"
            value={email}
            required
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="label">6-digit verification code</label>
          <input
            className="field tracking-[0.4em] font-mono text-center text-xl font-semibold"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            value={code}
            required
            autoFocus
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <p className="text-xs text-black/50 mt-1">
            Check your inbox or spam folder for the email from AI Code Reviewer.
          </p>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary w-full" disabled={loading || code.length !== 6}>
          {loading ? "Verifying…" : "Verify and activate account"}
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={resending || loading}
          className="btn-ghost w-full"
        >
          {resending ? "Sending new code…" : "Resend verification code"}
        </button>

        <p className="text-sm text-center pt-2 border-t border-line/50">
          <Link href="/login" className="text-signal font-medium">Back to login</Link>
        </p>
      </form>
    </main>
  );
}

export default function VerifyAccountPage() {
  return (
    <Suspense>
      <VerifyAccountForm />
    </Suspense>
  );
}
