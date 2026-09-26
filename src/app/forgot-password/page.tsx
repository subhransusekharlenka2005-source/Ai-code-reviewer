"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPasswordApi } from "@/services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await forgotPasswordApi(email);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Could not process request.");
      return;
    }

    setMessage(
      res.message ||
        "If that email is registered, a password reset link and 6-digit code have been sent to your inbox."
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16">
      <h1 className="font-display text-2xl font-semibold mb-6 text-ink">Reset your password</h1>
      <form onSubmit={onSubmit} className="card p-4 sm:p-6 space-y-4 bg-white shadow-sm">
        {message ? (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              ✓ {message}
            </div>
            <p className="text-xs text-black/60 dark:text-white/60">
              Check your inbox or spam folder for the email containing your reset link and 6-digit code.
            </p>
            <div className="pt-2">
              <Link
                href={`/reset-password?email=${encodeURIComponent(email)}`}
                className="btn-primary w-full block text-center"
              >
                Enter reset code
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="label">Email address</label>
              <input
                className="field"
                type="email"
                placeholder="you@example.com"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <p className="text-xs text-black/60 dark:text-white/60">
              We'll send you a password reset link and a 6-digit verification code.
            </p>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Sending reset email…" : "Send reset link & code"}
            </button>
          </>
        )}
        <p className="text-sm text-center pt-2 border-t border-line/50">
          <Link href="/login" className="text-signal font-medium">Back to login</Link>
        </p>
      </form>
    </main>
  );
}
