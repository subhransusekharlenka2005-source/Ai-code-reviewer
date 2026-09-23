export type UserProfile = {
  username: string;
  email: string;
  displayName: string | null;
};

export async function fetchCurrentSettingsApi(): Promise<{ user?: UserProfile; error?: string }> {
  try {
    const res = await fetch("/api/settings/me", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { error: data?.error || "Could not load settings." };
    }
    return { user: data.user };
  } catch (err: any) {
    return { error: err?.message || "Could not reach the server." };
  }
}

export async function updateProfileNameApi(displayName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Could not save profile name." };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}

export async function requestEmailChangeApi(payload: {
  newEmail: string;
  currentPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/settings/email/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Could not send verification code." };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}

export async function verifyEmailChangeApi(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/settings/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Verification failed." };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}

export async function changePasswordApi(payload: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Could not update password." };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}
