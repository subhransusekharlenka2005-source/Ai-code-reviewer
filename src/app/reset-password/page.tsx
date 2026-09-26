"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordApi } from "@/services/authService";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const urlToken = params.get("token") || "";
  const urlEmail = params.get("email") || "";

  const [token, setToken] = useState(urlToken);
  const [email, setEmail] = useState(urlEmail);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token.trim()) {
      setError("Please provide the reset token or 6-digit verification code from your email.");
      return;
    }

    setLoading(true);
    const res = await resetPasswordApi({
      token: token.trim(),
      email: email.trim() || undefined,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Password reset failed. Check your token or code and try again.");
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/login?mode=password");
      router.refresh();
    }, 1800);
  }

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16">
      <h1 className="font-display text-2xl font-semibold mb-6 text-ink">Choose a new password</h1>
      <form onSubmit={onSubmit} className="card p-4 sm:p-6 space-y-4 bg-white shadow-sm">
        {done ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-sm text-emerald-700 dark:text-emerald-300 font-medium">
            ✓ Password updated successfully! Redirecting to login…
          </div>
        ) : (
          <>
            {!urlToken && (
              <div>
                <label className="label">6-digit reset code or token</label>
                <input
                  className="field font-mono"
                  placeholder="Enter 6-digit code or link token"
                  value={token}
                  required
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
            )}
            {!urlEmail && (
              <div>
                <label className="label">Email address (optional)</label>
                <input
                  className="field"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="label">New password (min 8 characters)</label>
              <input
                className="field"
                type="password"
                value={form.password}
                required
                minLength={8}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                className="field"
                type="password"
                value={form.confirmPassword}
                required
                minLength={8}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Saving…" : "Save new password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
