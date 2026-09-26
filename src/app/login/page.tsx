"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { loginApi, sendLoginOtpApi, verifyLoginOtpApi } from "@/services/authService";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const emailParam = params.get("email") || "";
  const initialMode = params.get("mode") === "password" ? "password" : "otp";

  const [mode, setMode] = useState<"otp" | "password">(initialMode);
  const [form, setForm] = useState({ identifier: emailParam, password: "" });
  const [otpEmail, setOtpEmail] = useState(emailParam);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verified = params.get("verified") === "1";
  const loggedOut = params.get("logged_out") === "1";
  const redirectPath = params.get("redirect") || "/dashboard";

  // Password Login Submit
  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await loginApi(form);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Login failed.");
      return;
    }

    router.push(redirectPath);
    router.refresh();
  }

  // OTP Login: Step 1 - Send Code
  async function onSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await sendLoginOtpApi(otpEmail);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Failed to send login code.");
      return;
    }

    setOtpSent(true);
    if (res.code) {
      setOtpCode(res.code);
      setMessage(`✓ Login code: ${res.code} (Sent to your email and pre-filled below)`);
    } else {
      setMessage(res.message || "A 6-digit verification code was sent to your email.");
    }
  }

  // OTP Login: Step 2 - Verify Code & Login
  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await verifyLoginOtpApi(otpEmail, otpCode);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Verification failed. Check your code and try again.");
      return;
    }

    router.push(redirectPath);
    router.refresh();
  }

  // Resend OTP
  async function onResendOtp() {
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await sendLoginOtpApi(otpEmail);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Failed to resend code.");
    } else {
      if (res.code) {
        setOtpCode(res.code);
        setMessage(`✓ New login code: ${res.code} (Pre-filled below)`);
      } else {
        setMessage("A new 6-digit login code was sent to your email.");
      }
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16">
      <h1 className="font-display text-2xl font-semibold mb-6 text-ink">Log in</h1>

      <div className="card p-4 sm:p-6 space-y-4 bg-white shadow-sm">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-lg text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("otp");
              setError(null);
              setMessage(null);
            }}
            className={`py-2 rounded-md transition-all ${
              mode === "otp"
                ? "bg-white dark:bg-black/40 text-signal shadow-sm font-semibold"
                : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
            }`}
          >
            Email + OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
              setMessage(null);
            }}
            className={`py-2 rounded-md transition-all ${
              mode === "password"
                ? "bg-white dark:bg-black/40 text-signal shadow-sm font-semibold"
                : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
            }`}
          >
            Password
          </button>
        </div>

        {verified && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-sm text-emerald-700 dark:text-emerald-300 font-medium">
            ✓ Email verified successfully! You can now log in below.
          </div>
        )}

        {loggedOut && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-md text-sm text-blue-700 dark:text-blue-300 font-medium">
            ✓ You have been logged out successfully.
          </div>
        )}

        {message && <p className="text-sm text-good">{message}</p>}
        {error && <p className="error-text">{error}</p>}

        {mode === "otp" ? (
          /* Email + OTP Login Form */
          !otpSent ? (
            <form onSubmit={onSendOtp} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  className="field"
                  type="email"
                  placeholder="you@example.com"
                  value={otpEmail}
                  required
                  onChange={(e) => setOtpEmail(e.target.value)}
                />
              </div>
              <p className="text-xs text-black/50 dark:text-white/50">
                We'll email you a secure 6-digit one-time code to log in without needing a password.
              </p>
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Sending code…" : "Send login code"}
              </button>
            </form>
          ) : (
            <form onSubmit={onVerifyOtp} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label mb-0">Email address</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    className="text-xs text-signal hover:underline"
                  >
                    Change email
                  </button>
                </div>
                <input
                  className="field opacity-80"
                  type="email"
                  value={otpEmail}
                  disabled
                />
              </div>
              <div>
                <label className="label">6-digit verification code</label>
                <input
                  className="field tracking-[0.4em] font-mono text-center text-lg"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={otpCode}
                  required
                  autoFocus
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
              <button className="btn-primary w-full" disabled={loading || otpCode.length !== 6}>
                {loading ? "Verifying…" : "Log in with OTP"}
              </button>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={onResendOtp}
                  disabled={loading}
                  className="text-xs text-black/60 hover:text-signal"
                >
                  Didn't receive the code? Resend
                </button>
              </div>
            </form>
          )
        ) : (
          /* Password Login Form */
          <form onSubmit={onPasswordSubmit} className="space-y-4">
            <div>
              <label className="label">Username or email</label>
              <input
                className="field"
                value={form.identifier}
                required
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="field"
                type="password"
                value={form.password}
                required
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </button>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-black/40">Or</span>
              </div>
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
                router.push(redirectPath);
                router.refresh();
              }}
              disabled={loading}
              className="btn-ghost w-full border-signal/40 text-signal hover:bg-signal/5 font-semibold"
            >
              ⚡ Instant Demo Login
            </button>
          </form>
        )}

        <div className="flex justify-between text-sm pt-2 border-t border-line/50">
          <Link href="/register" className="text-signal font-medium">Create an account</Link>
          <Link href="/forgot-password" className="text-black/60 hover:text-black">Forgot password?</Link>
        </div>
      </div>
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
