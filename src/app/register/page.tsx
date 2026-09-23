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
    setLoading(true);

    const res = await registerApi(form);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Could not start registration.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <main className="max-w-md mx-auto px-8 py-20">
        <div className="card p-8 text-center">
          <h1 className="font-display text-xl font-semibold mb-3">Check your email</h1>
          <p className="text-sm text-black/60 mb-6">
            A 6-digit verification code was sent to <b>{form.email}</b>.
          </p>
          <Link href={`/verify-account?email=${encodeURIComponent(form.email)}`} className="btn-primary">
            Enter verification code
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-semibold mb-6">Create your account</h1>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
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
