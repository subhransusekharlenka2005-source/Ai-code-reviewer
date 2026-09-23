"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { loginApi } from "@/services/authService";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ identifier: "", password: "" });
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
          <p className="text-sm text-good">Your email is verified — you can log in now.</p>
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
        <div className="flex justify-between text-sm">
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
