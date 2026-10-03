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

function createSmtpStream(socket: net.Socket | tls.TLSSocket) {
  let buffer = "";
  let onLineCallback: ((line: string) => void) | null = null;
  const queue: string[] = [];

  socket.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\r\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 2);
      if (onLineCallback) {
        const cb = onLineCallback;
        onLineCallback = null;
        cb(line);
      } else {
        queue.push(line);
      }
    }
  });

  async function readLine(): Promise<string> {
    if (queue.length > 0) {
      return queue.shift()!;
    }
    return new Promise((resolve) => {
      onLineCallback = resolve;
    });
  }

  async function readResponse(): Promise<{ code: number; lines: string[]; text: string }> {
    const lines: string[] = [];
    while (true) {
      const line = await readLine();
      lines.push(line);
      if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) {
        const code = parseInt(line.slice(0, 3), 10);
        return { code, lines, text: lines.join("\n") };
      }
    }
  }

  return { readResponse };
}

/**
 * Direct, robust SMTP engine over STARTTLS that avoids middlebox TLS packet inspection resets.
 * Directly negotiates with Google Gmail SMTP servers and authenticates securely.
 */
async function deliverSmtpMessage(options: SendSmtpOptions): Promise<{ ok: boolean; response: string }> {
  const { host, port, user, pass, replyTo, to, subject, html } = options;
  const cleanUser = user.trim().toLowerCase();
  const cleanTo = to.trim().toLowerCase();
  const normalizedPassword = pass ? pass.replace(/\s+/g, "") : "";
  const userB64 = Buffer.from(cleanUser).toString("base64");
  const passB64 = Buffer.from(normalizedPassword).toString("base64");

  const socket = net.connect({
    port: port || 587,
    host: host || "smtp.gmail.com",
    family: 4,
  });
  socket.setTimeout(25000);

  const cleanup = () => {
    try { socket.destroy(); } catch {}
  };

  return new Promise(async (resolve, reject) => {
    socket.on("timeout", () => {
      cleanup();
      reject(new Error("SMTP connection timed out"));
    });

    socket.on("error", (err) => {
      cleanup();
      reject(new Error(`SMTP connection failed: ${err.message}`));
    });

    try {
      const initialStream = createSmtpStream(socket);

      // 1. Initial 220 banner
      const greeting = await initialStream.readResponse();
      if (greeting.code !== 220) throw new Error("Greeting failed: " + greeting.text);

      // 2. EHLO
      socket.write("EHLO localhost\r\n");
      const ehlo1 = await initialStream.readResponse();
      if (ehlo1.code !== 250) throw new Error("EHLO failed: " + ehlo1.text);

      // 3. STARTTLS
      socket.write("STARTTLS\r\n");
      const starttls = await initialStream.readResponse();
      if (starttls.code !== 220) throw new Error("STARTTLS failed: " + starttls.text);

      // Remove raw socket listener before upgrading
      socket.removeAllListeners("data");

      // 4. Upgrade socket to TLS without SNI
      const tlsSocket = tls.connect({
        socket,
        servername: undefined,
        rejectUnauthorized: false,
      });

      await new Promise<void>((resTls, rejTls) => {
        tlsSocket.once("secureConnect", () => resTls());
        tlsSocket.once("error", rejTls);
      });

      tlsSocket.setTimeout(25000);
      tlsSocket.on("timeout", () => {
        try { tlsSocket.destroy(); } catch {}
        reject(new Error("Secure SMTP connection timed out"));
      });

      tlsSocket.on("error", (err) => {
        try { tlsSocket.destroy(); } catch {}
        reject(new Error(`Secure SMTP TLS error: ${err.message}`));
      });

      const tlsStream = createSmtpStream(tlsSocket);

      // 5. EHLO after TLS upgrade
      tlsSocket.write("EHLO localhost\r\n");
      const ehlo2 = await tlsStream.readResponse();
      if (ehlo2.code !== 250) throw new Error("TLS EHLO failed: " + ehlo2.text);

      // 6. AUTH LOGIN
      tlsSocket.write("AUTH LOGIN\r\n");
      const auth1 = await tlsStream.readResponse();
      if (auth1.code !== 334) throw new Error("AUTH LOGIN failed: " + auth1.text);

      // 7. Username
      tlsSocket.write(userB64 + "\r\n");
      const auth2 = await tlsStream.readResponse();
      if (auth2.code !== 334) throw new Error("Username rejected: " + auth2.text);

      // 8. Password
      tlsSocket.write(passB64 + "\r\n");
      const auth3 = await tlsStream.readResponse();
      if (auth3.code !== 235) throw new Error("Authentication failed: " + auth3.text);

      // 9. MAIL FROM
      tlsSocket.write(`MAIL FROM:<${cleanUser}>\r\n`);
      const mailFrom = await tlsStream.readResponse();
      if (mailFrom.code !== 250) throw new Error("MAIL FROM rejected: " + mailFrom.text);

      // 10. RCPT TO
      tlsSocket.write(`RCPT TO:<${cleanTo}>\r\n`);
      const rcptTo = await tlsStream.readResponse();
      if (rcptTo.code !== 250) throw new Error("Recipient rejected: " + rcptTo.text);

      // 11. DATA
      tlsSocket.write("DATA\r\n");
      const dataResp = await tlsStream.readResponse();
      if (dataResp.code !== 354) throw new Error("DATA command rejected: " + dataResp.text);

      // 12. Send Email Body
      const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@gmail.com>`;
      const headerLines = [
        `From: "AI Code Reviewer" <${cleanUser}>`,
        `To: ${cleanTo}`,
        replyTo ? `Reply-To: ${replyTo}` : "",
        `Subject: ${subject}`,
        `Message-ID: ${messageId}`,
        `Date: ${new Date().toUTCString()}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: 8bit`,
      ].filter(Boolean);

      const emailPayload = headerLines.join("\r\n") + "\r\n\r\n" + html + "\r\n.\r\n";
      tlsSocket.write(emailPayload);

      const doneResp = await tlsStream.readResponse();
      if (doneResp.code !== 250) throw new Error("Message submission failed: " + doneResp.text);

      try {
        tlsSocket.write("QUIT\r\n");
        tlsSocket.destroy();
      } catch {}

      resolve({ ok: true, response: doneResp.text });
    } catch (err: any) {
      cleanup();
      reject(err);
    }
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

    const socket = net.connect({
      port,
      host,
      family: 4,
    });
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