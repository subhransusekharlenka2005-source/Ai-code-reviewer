"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <p className="error-text">Missing reset token. Use the link from your email.</p>;
  }

  return (
    <main className="max-w-md mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-semibold mb-6">Choose a new password</h1>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        {done ? (
          <p className="text-sm text-good">Password updated. Redirecting to login…</p>
        ) : (
          <>
            <div>
              <label className="label">New password</label>
              <input className="field" type="password" value={form.password} required
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input className="field" type="password" value={form.confirmPassword} required
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Saving…" : "Save new password"}
            </button>
          </>
        )}
        <p className="text-sm text-center">
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
