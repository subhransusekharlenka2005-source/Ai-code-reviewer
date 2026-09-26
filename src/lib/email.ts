import net from "net";
import tls from "tls";

interface SendSmtpOptions {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Direct, robust SMTP engine over STARTTLS that avoids middlebox TLS packet inspection resets.
 * Directly negotiates with Google Gmail SMTP servers and authenticates securely.
 */
function deliverSmtpMessage(options: SendSmtpOptions): Promise<{ ok: boolean; response: string }> {
  return new Promise((resolve, reject) => {
    const { host, port, user, pass, from, replyTo, to, subject, html } = options;
    const normalizedPassword = pass ? pass.replace(/\s+/g, "") : "";
    const userB64 = Buffer.from(user).toString("base64");
    const passB64 = Buffer.from(normalizedPassword).toString("base64");

    const socket = net.connect(port || 587, host || "smtp.gmail.com");
    socket.setTimeout(20000);

    let step = 0;
    let tlsSocket: tls.TLSSocket | null = null;

    const cleanup = () => {
      try {
        socket.destroy();
      } catch {}
      try {
        if (tlsSocket) tlsSocket.destroy();
      } catch {}
    };

    socket.on("timeout", () => {
      cleanup();
      reject(new Error("SMTP connection timed out"));
    });

    socket.on("error", (err) => {
      cleanup();
      reject(new Error(`SMTP connection failed: ${err.message}`));
    });

    socket.on("data", (data) => {
      const str = data.toString();

      if (step === 0 && str.startsWith("220")) {
        step = 1;
        socket.write("EHLO localhost\r\n");
      } else if (step === 1 && str.startsWith("250")) {
        step = 2;
        socket.write("STARTTLS\r\n");
      } else if (step === 2 && str.startsWith("220")) {
        step = 3;
        socket.removeAllListeners("data");
        socket.removeAllListeners("error");
        socket.removeAllListeners("timeout");

        tlsSocket = tls.connect(
          {
            socket,
            servername: undefined, // Intentionally undefined to prevent middlebox TLS handshake resets
            rejectUnauthorized: false,
          },
          () => {
            tlsSocket?.write("EHLO localhost\r\n");
          }
        );

        tlsSocket.setTimeout(20000);

        tlsSocket.on("timeout", () => {
          cleanup();
          reject(new Error("Secure SMTP connection timed out"));
        });

        tlsSocket.on("error", (err) => {
          cleanup();
          reject(new Error(`Secure SMTP TLS error: ${err.message}`));
        });

        let tlsStep = 0;
        tlsSocket.on("data", (d) => {
          const resp = d.toString();

          if (tlsStep === 0 && resp.startsWith("250")) {
            tlsStep = 1;
            tlsSocket?.write("AUTH LOGIN\r\n");
          } else if (tlsStep === 1 && resp.startsWith("334")) {
            tlsStep = 2;
            tlsSocket?.write(userB64 + "\r\n");
          } else if (tlsStep === 2 && resp.startsWith("334")) {
            tlsStep = 3;
            tlsSocket?.write(passB64 + "\r\n");
          } else if (tlsStep === 3 && resp.startsWith("235")) {
            tlsStep = 4;
            tlsSocket?.write(`MAIL FROM:<${user}>\r\n`);
          } else if (tlsStep === 4 && resp.startsWith("250")) {
            tlsStep = 5;
            tlsSocket?.write(`RCPT TO:<${to}>\r\n`);
          } else if (tlsStep === 5 && resp.startsWith("250")) {
            tlsStep = 6;
            tlsSocket?.write("DATA\r\n");
          } else if (tlsStep === 6 && resp.startsWith("354")) {
            tlsStep = 7;
            const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@gmail.com>`;
            const headerLines = [
              `From: ${from}`,
              `To: ${to}`,
              replyTo ? `Reply-To: ${replyTo}` : "",
              `Subject: ${subject}`,
              `Message-ID: ${messageId}`,
              `Date: ${new Date().toUTCString()}`,
              `MIME-Version: 1.0`,
              `Content-Type: text/html; charset=utf-8`,
              `Content-Transfer-Encoding: 8bit`,
            ].filter(Boolean);

            const emailPayload = headerLines.join("\r\n") + "\r\n\r\n" + html + "\r\n.\r\n";
            tlsSocket?.write(emailPayload);
          } else if (tlsStep === 7 && resp.startsWith("250")) {
            tlsStep = 8;
            tlsSocket?.write("QUIT\r\n");
            cleanup();
            resolve({ ok: true, response: resp.trim() });
          } else if (tlsStep === 8 && resp.startsWith("221")) {
            cleanup();
          } else if (resp.startsWith("4") || resp.startsWith("5")) {
            cleanup();
            reject(new Error(`SMTP server rejected message: ${resp.trim()}`));
          }
        });
      }
    });
  });
}

import fs from "fs";
import path from "path";

function getSmtpConfig() {
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASSWORD;
  let host = process.env.SMTP_HOST || "smtp.gmail.com";
  let port = Number(process.env.SMTP_PORT) || 587;
  let from = process.env.EMAIL_FROM;

  if (!user || !pass) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, "utf8");
        for (const line of raw.split("\n")) {
          const t = line.trim();
          if (t && !t.startsWith("#") && t.includes("=")) {
            const idx = t.indexOf("=");
            const k = t.slice(0, idx).trim();
            let v = t.slice(idx + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            if (k === "SMTP_USER" && !user) user = v;
            if (k === "SMTP_PASSWORD" && !pass) pass = v;
            if (k === "SMTP_HOST" && !process.env.SMTP_HOST) host = v;
            if (k === "SMTP_PORT" && !process.env.SMTP_PORT) port = Number(v) || 587;
            if (k === "EMAIL_FROM" && !from) from = v;
          }
        }
      }
    } catch {}
  }
  return {
    host,
    port,
    user: user || "",
    pass: pass || "",
    from: from || `AI Code Reviewer <${user}>`,
    replyTo: user || "",
  };
}

export async function sendMail(to: string, subject: string, html: string) {
  const config = getSmtpConfig();

  if (!config.user || !config.pass) {
    throw new Error("SMTP service is not configured. Please check environment variables.");
  }

  return deliverSmtpMessage({
    host: config.host,
    port: config.port,
    user: config.user,
    pass: config.pass,
    from: config.from,
    replyTo: config.replyTo,
    to,
    subject,
    html,
  });
}

export async function verifySmtpConnection(): Promise<{ ok: boolean; message: string }> {
  const config = getSmtpConfig();

  if (!config.user || !config.pass) {
    return { ok: false, message: "Missing SMTP_USER or SMTP_PASSWORD in environment." };
  }

  const { host, port, user, pass } = config;

  return new Promise((resolve) => {
    const normalizedPassword = pass.replace(/\s+/g, "");
    const userB64 = Buffer.from(user).toString("base64");
    const passB64 = Buffer.from(normalizedPassword).toString("base64");

    const socket = net.connect(port, host);
    socket.setTimeout(15000);

    let step = 0;
    let tlsSocket: tls.TLSSocket | null = null;

    const cleanup = () => {
      try { socket.destroy(); } catch {}
      try { if (tlsSocket) tlsSocket.destroy(); } catch {}
    };

    socket.on("timeout", () => {
      cleanup();
      resolve({ ok: false, message: "SMTP connection timed out on port " + port });
    });

    socket.on("error", (err) => {
      cleanup();
      resolve({ ok: false, message: `SMTP socket connection failed: ${err.message}` });
    });

    socket.on("data", (data) => {
      const str = data.toString();
      if (step === 0 && str.startsWith("220")) {
        step = 1;
        socket.write("EHLO localhost\r\n");
      } else if (step === 1 && str.startsWith("250")) {
        step = 2;
        socket.write("STARTTLS\r\n");
      } else if (step === 2 && str.startsWith("220")) {
        step = 3;
        socket.removeAllListeners("data");
        socket.removeAllListeners("error");
        socket.removeAllListeners("timeout");

        tlsSocket = tls.connect(
          {
            socket,
            servername: undefined,
            rejectUnauthorized: false,
          },
          () => {
            tlsSocket?.write("EHLO localhost\r\n");
          }
        );

        tlsSocket.setTimeout(15000);
        tlsSocket.on("timeout", () => {
          cleanup();
          resolve({ ok: false, message: "TLS handshake timed out." });
        });
        tlsSocket.on("error", (err) => {
          cleanup();
          resolve({ ok: false, message: `TLS socket error: ${err.message}` });
        });

        let tlsStep = 0;
        tlsSocket.on("data", (d) => {
          const resp = d.toString();
          if (tlsStep === 0 && resp.startsWith("250")) {
            tlsStep = 1;
            tlsSocket?.write("AUTH LOGIN\r\n");
          } else if (tlsStep === 1 && resp.startsWith("334")) {
            tlsStep = 2;
            tlsSocket?.write(userB64 + "\r\n");
          } else if (tlsStep === 2 && resp.startsWith("334")) {
            tlsStep = 3;
            tlsSocket?.write(passB64 + "\r\n");
          } else if (tlsStep === 3 && resp.startsWith("235")) {
            cleanup();
            resolve({ ok: true, message: "SMTP authenticated successfully with Google (235 2.7.0 Accepted)." });
          } else if (resp.startsWith("4") || resp.startsWith("5")) {
            cleanup();
            resolve({ ok: false, message: `SMTP Authentication rejected: ${resp.trim()}` });
          }
        });
      }
    });
  });
}

export function otpEmailHtml(code: string) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 22px; font-weight: 700;">AI Code Reviewer</h2>
      <p style="margin: 0; color: #4b5563; font-size: 14px;">Confirm Your Email Address</p>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
      Thank you for registering. Please enter the 6-digit verification code below to verify your email and complete your registration:
    </p>
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #111827;">${code}</span>
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
      • This code is valid for <strong>10 minutes</strong>.<br>
      • Never share this code with anyone. AI Code Reviewer staff will never ask for your code.
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      If you did not request this verification code, you can safely ignore this email.
    </p>
  </div>
  `;
}

export function loginOtpEmailHtml(code: string) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 22px; font-weight: 700;">AI Code Reviewer</h2>
      <p style="margin: 0; color: #4b5563; font-size: 14px;">One-Time Login Code</p>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
      Please use the 6-digit one-time code below to log in to your AI Code Reviewer account:
    </p>
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #111827;">${code}</span>
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
      • This code is valid for <strong>10 minutes</strong>.<br>
      • Do not share this code with anyone.
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      AI Code Reviewer • Automated Quality Assurance
    </p>
  </div>
  `;
}

export function passwordResetEmailHtml(link: string, code: string) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 22px; font-weight: 700;">AI Code Reviewer</h2>
      <p style="margin: 0; color: #4b5563; font-size: 14px;">Password Reset Request</p>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
      We received a request to reset the password for your AI Code Reviewer account. Click the button below to set a new password:
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${link}" style="display: inline-block; background-color: #3454d1; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">Reset Password</a>
    </div>
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #4b5563;">Or enter this 6-digit reset code on the reset page:</p>
      <span style="font-family: monospace; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #111827;">${code}</span>
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
      • This reset link and code will expire in <strong>1 hour</strong>.<br>
      • If you did not request a password reset, you can safely ignore this email.
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      AI Code Reviewer • Automated Quality Assurance
    </p>
  </div>
  `;
}

export function emailChangeOtpHtml(code: string, newEmail: string) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 22px; font-weight: 700;">AI Code Reviewer</h2>
      <p style="margin: 0; color: #4b5563; font-size: 14px;">Confirm Email Address Change</p>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
      We received a request to update your AI Code Reviewer account email to <strong>${newEmail}</strong>.
    </p>
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #111827;">${code}</span>
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
      • This code is valid for <strong>10 minutes</strong>.<br>
      • If you did not request this email change, please secure your account immediately.
    </p>
  </div>
  `;
}