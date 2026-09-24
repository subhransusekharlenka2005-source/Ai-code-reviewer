"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { loginApi } from "@/services/authService";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const emailParam = params.get("email") || "";
  const [form, setForm] = useState({ identifier: emailParam, password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verified = params.get("verified") === "1";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await loginApi(form);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Login failed.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="max-w-md mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-semibold mb-6">Log in</h1>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        {verified && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-sm text-emerald-700 dark:text-emerald-300 font-medium">
            ✓ Email verified successfully! Please enter your password to log in.
          </div>
        )}
        <div>
          <label className="label">Username or email</label>
          <input className="field" value={form.identifier} required
            onChange={(e) => setForm({ ...form, identifier: e.target.value })} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="field" type="password" value={form.password} required
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-black/40">Or</span></div>
        </div>
        <button
          type="button"
          onClick={async () => {
            setError(null);
            setLoading(true);
            const res = await loginApi({ identifier: "developer", password: "password123" });
            setLoading(false);
            if (!res.ok) {
              setError(res.error || "Login failed.");
              return;
            }
            router.push("/dashboard");
            router.refresh();
          }}
          disabled={loading}
          className="btn-ghost w-full border-signal/40 text-signal hover:bg-signal/5 font-semibold"
        >
          ⚡ Instant Demo Login
        </button>
        <div className="flex justify-between text-sm pt-2">
          <Link href="/register" className="text-signal font-medium">Create an account</Link>
          <Link href="/forgot-password" className="text-black/60">Forgot password?</Link>
        </div>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
