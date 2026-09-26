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
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await registerApi(form);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Could not start registration.");
      return;
    }

    if (res.autoLogin) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const code = res.code || "";
    setGeneratedCode(code);
    setSent(true);

    const codeParam = code ? `&code=${encodeURIComponent(code)}` : "";
    router.push(`/verify-account?email=${encodeURIComponent(form.email)}&sent=1${codeParam}`);
  }

  if (sent) {
    return (
      <main className="max-w-md mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-20">
        <div className="card p-6 sm:p-8 text-center space-y-4 bg-white shadow-sm">
          <h1 className="font-display text-xl font-semibold text-ink">Check your email</h1>
          <p className="text-sm text-black/60">
            A 6-digit verification code was sent to <b>{form.email}</b>.
          </p>
          {generatedCode && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              Verification Code: <span className="font-mono font-bold tracking-widest text-base">{generatedCode}</span>
            </div>
          )}
          <div>
            <Link
              href={`/verify-account?email=${encodeURIComponent(form.email)}${
                generatedCode ? `&code=${encodeURIComponent(generatedCode)}` : ""
              }`}
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
      <form onSubmit={onSubmit} className="card p-4 sm:p-6 space-y-4 bg-white shadow-sm">
        <div><label className="label">Username</label><input className="field" value={form.username} required minLength={3} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
        <div><label className="label">Email</label><input className="field" type="email" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Password</label><input className="field" type="password" value={form.password} required minLength={8} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div><label className="label">Confirm password</label><input className="field" type="password" value={form.confirmPassword} required onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Sending code…" : "Create account"}</button>
        <p className="text-sm text-black/60 text-center">Already have an account? <Link href="/login" className="text-signal font-medium">Log in</Link></p>
      </form>
    </main>
  );
}
