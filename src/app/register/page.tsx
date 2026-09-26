"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerApi } from "@/services/authService";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    const res = await registerApi(form);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Could not complete registration.");
      return;
    }

    if (res.autoLogin) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setSent(true);
    router.push(`/verify-account?email=${encodeURIComponent(form.email)}&sent=1`);
  }

  if (sent) {
    return (
      <main className="max-w-md mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-20">
        <div className="card p-6 sm:p-8 text-center space-y-4 bg-white shadow-sm border border-line">
          <div className="w-12 h-12 bg-signal/10 text-signal rounded-full flex items-center justify-center mx-auto text-xl">
            ✉
          </div>
          <h1 className="font-display text-xl font-semibold text-ink">Check your email</h1>
          <p className="text-sm text-black/60">
            A 6-digit verification code has been dispatched to <b>{form.email}</b>.
          </p>
          <p className="text-xs text-black/50">
            Please check your inbox or spam folder and enter the verification code to activate your account.
          </p>
          <div className="pt-2">
            <Link
              href={`/verify-account?email=${encodeURIComponent(form.email)}`}
              className="btn-primary w-full inline-block"
            >
              Enter verification code
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16">
      <h1 className="font-display text-2xl font-semibold mb-6 text-ink">Create your account</h1>
      <form onSubmit={onSubmit} className="card p-4 sm:p-6 space-y-4 bg-white shadow-sm border border-line">
        <div>
          <label className="label">Username</label>
          <input
            className="field"
            value={form.username}
            required
            minLength={3}
            placeholder="johndoe"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Email address</label>
          <input
            className="field"
            type="email"
            value={form.email}
            required
            placeholder="you@example.com"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="field"
            type="password"
            value={form.password}
            required
            minLength={8}
            placeholder="At least 8 characters"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input
            className="field"
            type="password"
            value={form.confirmPassword}
            required
            minLength={8}
            placeholder="Re-enter your password"
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Sending verification code…" : "Create account"}
        </button>
        <p className="text-sm text-black/60 text-center pt-2 border-t border-line/50">
          Already have an account? <Link href="/login" className="text-signal font-medium">Log in</Link>
        </p>
      </form>
    </main>
  );
}
