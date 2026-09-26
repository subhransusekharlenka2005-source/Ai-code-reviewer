"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { verifyOtpApi, resendOtpApi } from "@/services/authService";

function VerifyAccountForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialEmail = params.get("email") || "";
  const initialCode = params.get("code") || "";
  const justSent = params.get("sent") === "1";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    initialCode
      ? `Verification code: ${initialCode}`
      : justSent && initialEmail
      ? `A 6-digit verification code was sent to ${initialEmail}. Please check your inbox or spam folder.`
      : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCode && !code) {
      setCode(initialCode);
    }
  }, [initialCode]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await verifyOtpApi(email, code);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Verification failed. Check your code and try again.");
      return;
    }

    // Successfully verified and session created! Redirect to dashboard
    router.push("/dashboard");
    router.refresh();
  }

  async function resend() {
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await resendOtpApi(email);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Could not resend code.");
    } else {
      if (res.code) {
        setCode(res.code);
        setMessage(`✓ New verification code: ${res.code} (Dispatched to your email and pre-filled below)`);
      } else {
        setMessage(res.message || "A new code was sent to your email.");
      }
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16">
      <h1 className="font-display text-2xl font-semibold mb-6 text-ink">Verify your email</h1>
      <form onSubmit={verify} className="card p-4 sm:p-6 space-y-4 bg-white shadow-sm">
        {code && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-sm text-emerald-700 dark:text-emerald-300 font-medium">
            ✓ Verification Code: <span className="font-mono font-bold tracking-widest text-base">{code}</span>
            <p className="text-xs font-normal mt-1 opacity-90">Pre-filled below so you can verify instantly.</p>
          </div>
        )}

        <div>
          <label className="label">Email</label>
          <input
            className="field"
            type="email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="label">6-digit verification code</label>
          <input
            className="field tracking-[0.4em] font-mono text-center text-lg"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            value={code}
            required
            autoFocus
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>

        {error && <p className="error-text">{error}</p>}
        {message && !code && <p className="text-sm text-good">{message}</p>}

        <button className="btn-primary w-full" disabled={loading || code.length !== 6}>
          {loading ? "Verifying…" : "Verify and create account"}
        </button>

        <button type="button" onClick={resend} disabled={loading} className="btn-ghost w-full">
          Resend code
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
