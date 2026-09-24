import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  EMAIL_FROM,
} = process.env;

const normalizedPassword = SMTP_PASSWORD?.replace(/\s+/g, "");
const smtpPort = Number(SMTP_PORT) || 587;

const transporter =
  SMTP_HOST && SMTP_USER && normalizedPassword
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: smtpPort,

        // Gmail port 587 uses STARTTLS.
        // Port 465 uses implicit TLS.
        secure: smtpPort === 465,

        // Explicitly require STARTTLS when using port 587.
        requireTLS: smtpPort === 587,

        auth: {
          user: SMTP_USER,
          pass: normalizedPassword,
        },

        tls: {
          servername: SMTP_HOST,
          minVersion: "TLSv1.2",
        },

        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      })
    : null;

export async function sendMail(
  to: string,
  subject: string,
  html: string
) {
  if (!transporter) {
    console.log("\n----- EMAIL (SMTP not configured) -----");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(html.replace(/<[^>]+>/g, " "));
    console.log("---------------------------------------\n");
    return;
  }

  try {
    await transporter.sendMail({
      from: EMAIL_FROM || (SMTP_USER ? `AI Code Reviewer <${SMTP_USER}>` : "AI Code Reviewer <no-reply@example.com>"),
      to,
      subject,
      html,
    });
  } catch (error: any) {
    console.error(
      "SMTP send failed:",
      error?.code || "UNKNOWN",
      error?.responseCode || "",
      error?.message || error
    );

    throw new Error(
      "Unable to send email. Check SMTP settings and your Google App Password."
    );
  }
}

export function otpEmailHtml(code: string) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 700;">AI Code Reviewer</h2>
      <p style="margin: 0; color: #4b5563; font-size: 14px;">Email Verification Code</p>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
      Please use the 6-digit verification code below to confirm your email and complete your account setup:
    </p>
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
      <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #111827;">${code}</span>
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
      • This code is valid for <strong>10 minutes</strong>.<br>
      • After entering this code on the verification page, you can log in to your account.
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      If you did not request this verification code, please ignore this email.
    </p>
  </div>
  `;
}

export function loginOtpEmailHtml(code: string) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 700;">AI Code Reviewer</h2>
      <p style="margin: 0; color: #4b5563; font-size: 14px;">One-Time Login Code</p>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
      Please use the 6-digit one-time password below to sign in to your AI Code Reviewer account:
    </p>
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
      <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #111827;">${code}</span>
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
      • This code is valid for <strong>10 minutes</strong>.<br>
      • If you did not request this login code, you can safely ignore this email.
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      AI Code Reviewer • Automated Quality Assurance
    </p>
  </div>
  `;
}

export function emailChangeOtpHtml(code: string, newEmail: string) {
  return `<p>We received a request to change your AI Code Reviewer email to <b>${newEmail}</b>.</p>
  <p>Your verification code is:</p>
  <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
  <p>This code expires in 10 minutes.</p>`;
}

export function passwordResetEmailHtml(link: string, code?: string) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 700;">AI Code Reviewer</h2>
      <p style="margin: 0; color: #4b5563; font-size: 14px;">Password Reset Request</p>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
      We received a request to reset your AI Code Reviewer password. Click the link below to choose a new password:
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">Reset My Password</a>
    </div>
    ${code ? `
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 14px; text-align: center; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #4b5563;">Or enter this 6-digit reset code on the reset page:</p>
      <span style="font-family: monospace; font-size: 26px; font-weight: 800; letter-spacing: 6px; color: #111827;">${code}</span>
    </div>
    ` : ""}
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
      • This reset link and code are valid for <strong>1 hour</strong>.<br>
      • If you did not request a password reset, you can safely ignore this email.
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      AI Code Reviewer • Automated Quality Assurance
    </p>
  </div>
  `;
}