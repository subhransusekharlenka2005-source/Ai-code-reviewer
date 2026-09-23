"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || "If that email is registered, a reset link is on its way.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-semibold mb-6">Reset your password</h1>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        {message ? (
          <p className="text-sm text-black/70">{message}</p>
        ) : (
          <>
            <div>
              <label className="label">Email</label>
              <input className="field" type="email" value={email} required
                onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
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
