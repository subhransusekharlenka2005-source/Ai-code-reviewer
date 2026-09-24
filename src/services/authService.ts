export type AuthResult = {
  ok: boolean;
  error?: string;
  message?: string;
  autoLogin?: boolean;
  code?: string;
};

export async function loginApi(credentials: { identifier: string; password: string }): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Login failed." };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}

export async function sendLoginOtpApi(email: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Failed to send login code." };
    }
    return {
      ok: true,
      message: data?.message || "A verification code has been sent to your email.",
      code: data?.code,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}

export async function verifyLoginOtpApi(email: string, code: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
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

export async function logoutApi(): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Logout failed." };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}

export async function registerApi(formData: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Registration failed." };
    }
    return { ok: true, autoLogin: data?.autoLogin, code: data?.code };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}

export async function verifyOtpApi(email: string, code: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
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

export async function resendOtpApi(email: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Could not resend code." };
    }
    return { ok: true, message: data?.message || "A new code was sent.", code: data?.code };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}

export async function forgotPasswordApi(email: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Could not process request." };
    }
    return {
      ok: true,
      message: data?.message || "If that email is registered, a reset link and code are on the way.",
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}

export async function resetPasswordApi(payload: {
  token: string;
  email?: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error || "Password reset failed." };
    }
    return { ok: true, message: data?.message };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach the server." };
  }
}
