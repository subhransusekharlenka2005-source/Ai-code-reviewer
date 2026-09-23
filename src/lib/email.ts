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
      from: EMAIL_FROM || "AI Code Reviewer <no-reply@example.com>",
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
  return `<p>Your AI Code Reviewer verification code is:</p>
  <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
  <p>This code expires in 10 minutes and can only be used a limited number of times.</p>
  <p>If you did not request this, you can ignore this email.</p>`;
}

export function emailChangeOtpHtml(code: string, newEmail: string) {
  return `<p>We received a request to change your AI Code Reviewer email to <b>${newEmail}</b>.</p>
  <p>Your verification code is:</p>
  <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
  <p>This code expires in 10 minutes.</p>`;
}

export function passwordResetEmailHtml(link: string) {
  return `<p>We received a request to reset your AI Code Reviewer password.</p>
  <p><a href="${link}">Choose a new password</a>. This link expires in 1 hour.</p>`;
}