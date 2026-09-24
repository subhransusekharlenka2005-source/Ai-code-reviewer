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
    justSent && initialEmail ? `A 6-digit verification code was sent to ${initialEmail}. Please check your inbox or spam folder.` : null
  );
  const [loading, setLoading] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await verifyOtpApi(email, code);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Verification failed.");
      return;
    }

    router.push(`/login?verified=1&email=${encodeURIComponent(email)}`);
    router.refresh();
  }

  async function resend() {
    setError(null);
    setMessage(null);

    const res = await resendOtpApi(email);
    if (!res.ok) {
      setError(res.error || "Could not resend code.");
    } else {
      setMessage("A new code was sent.");
    }
  }

  return (
    <main className="max-w-md mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-semibold mb-6">Verify your email</h1>
      <form onSubmit={verify} className="card p-6 space-y-4">
        <div><label className="label">Email</label><input className="field" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">6-digit code</label><input className="field tracking-[0.4em]" inputMode="numeric" maxLength={6} value={code} required onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
        {error && <p className="error-text">{error}</p>}
        {message && <p className="text-sm text-good">{message}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Verifying…" : "Verify and create account"}</button>
        <button type="button" onClick={resend} className="btn-ghost w-full">Resend code</button>
        <p className="text-sm text-center"><Link href="/login" className="text-signal">Back to login</Link></p>
      </form>
    </main>
  );
}

export default function VerifyAccountPage() {
  return <Suspense><VerifyAccountForm /></Suspense>;
}
