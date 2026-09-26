"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchCurrentSettingsApi,
  updateProfileNameApi,
  requestEmailChangeApi,
  verifyEmailChangeApi,
  changePasswordApi,
} from "@/services/settingsService";

export default function SettingsPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "verify">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadCurrent() {
    const res = await fetchCurrentSettingsApi();
    if (res.user) {
      setDisplayName(res.user.displayName || "");
      setNewEmail(res.user.email || "");
    }
  }

  useEffect(() => {
    void loadCurrent();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await updateProfileNameApi(displayName);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Could not save settings.");
      return;
    }
    setMessage("Name saved.");
    router.refresh();
  }

  async function requestEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await requestEmailChangeApi({
      newEmail,
      currentPassword: emailCurrentPassword,
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Could not send verification code.");
      return;
    }
    setEmailStep("verify");
    setMessage("A verification code was sent to your new email.");
  }

  async function verifyEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await verifyEmailChangeApi(emailCode);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Verification failed.");
      return;
    }
    setEmailStep("idle");
    setEmailCurrentPassword("");
    setEmailCode("");
    setMessage("Email address updated successfully.");
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await changePasswordApi({
      currentPassword: passwordCurrent,
      newPassword,
      confirmNewPassword,
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Could not change password.");
      return;
    }
    setPasswordCurrent("");
    setNewPassword("");
    setConfirmNewPassword("");
    setMessage("Password changed successfully.");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Settings</h1>
        <p className="text-xs sm:text-sm text-black/60 mt-1">Manage your account details and security.</p>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="text-sm text-good font-medium">{message}</p>}

      <form onSubmit={saveProfile} className="card p-4 sm:p-6 space-y-4 bg-white shadow-sm">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <div>
          <label className="label">Display Name</label>
          <input
            className="field"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={80}
          />
        </div>
        <button className="btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Save name"}
        </button>
      </form>

      <form
        onSubmit={emailStep === "idle" ? requestEmailChange : verifyEmailChange}
        className="card p-4 sm:p-6 space-y-4 bg-white shadow-sm"
      >
        <h2 className="font-display text-lg font-semibold">Email address</h2>
        {emailStep === "idle" ? (
          <>
            <div>
              <label className="label">New email</label>
              <input
                className="field"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Current password</label>
              <input
                className="field"
                type="password"
                required
                value={emailCurrentPassword}
                onChange={(e) => setEmailCurrentPassword(e.target.value)}
              />
            </div>
            <p className="text-xs text-black/50">
              A 6-digit OTP will be sent to the new email via Gmail SMTP before the change is applied.
            </p>
            <button className="btn-primary" disabled={loading}>
              {loading ? "Sending OTP…" : "Send email-change OTP"}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="label">6-digit OTP</label>
              <input
                className="field tracking-[0.4em]"
                inputMode="numeric"
                maxLength={6}
                required
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <button className="btn-primary" disabled={loading}>
              {loading ? "Verifying…" : "Verify and change email"}
            </button>
          </>
        )}
      </form>

      <form onSubmit={changePassword} className="card p-4 sm:p-6 space-y-4 bg-white shadow-sm">
        <h2 className="font-display text-lg font-semibold">Password</h2>
        <div>
          <label className="label">Current password</label>
          <input
            className="field"
            type="password"
            required
            value={passwordCurrent}
            onChange={(e) => setPasswordCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="label">New password</label>
          <input
            className="field"
            type="password"
            required
            minLength={8}
            value={newPassword}
            autoComplete="new-password"
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input
            className="field"
            type="password"
            required
            minLength={8}
            value={confirmNewPassword}
            autoComplete="new-password"
            onChange={(e) => setConfirmNewPassword(e.target.value)}
          />
        </div>
        <button className="btn-primary" disabled={loading}>
          {loading ? "Updating password…" : "Change password"}
        </button>
      </form>
    </main>
  );
}
