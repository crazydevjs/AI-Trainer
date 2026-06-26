import "server-only";
import nodemailer from "nodemailer";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function send(to: string, subject: string, html: string, link: string) {
  const transport = getTransport();
  if (!transport) {
    // Dev fallback: no SMTP configured — print the actionable link.
    console.log(`\n📧 [DEV EMAIL] To: ${to}\n   ${subject}\n   ${link}\n`);
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || "FORGE <no-reply@forge.app>",
    to,
    subject,
    html,
  });
}

const wrap = (heading: string, body: string, cta: string, link: string) => `
  <div style="background:#050505;padding:40px;font-family:system-ui,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#121216;border:1px solid #2a2a32;border-radius:24px;padding:32px;color:#f5f5f7">
      <h1 style="font-size:22px;margin:0 0 8px;color:#ff3b30">FORGE</h1>
      <h2 style="font-size:18px;margin:0 0 12px">${heading}</h2>
      <p style="color:#a1a1aa;line-height:1.6;margin:0 0 24px">${body}</p>
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#ff3b30,#ff7a18);color:#fff;text-decoration:none;padding:12px 24px;border-radius:14px;font-weight:600">${cta}</a>
      <p style="color:#6b6b76;font-size:12px;margin:24px 0 0">If you didn't request this, you can ignore this email.</p>
    </div>
  </div>`;

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${appUrl}/api/auth/verify?token=${token}`;
  await send(
    to,
    "Verify your FORGE account",
    wrap(
      "Confirm your email",
      "Verify your email to activate your AI training account and start forging your best self.",
      "Verify Email",
      link
    ),
    link
  );
}

export async function sendResetEmail(to: string, token: string) {
  const link = `${appUrl}/reset-password?token=${token}`;
  await send(
    to,
    "Reset your FORGE password",
    wrap(
      "Reset your password",
      "We received a request to reset your password. This link expires in 1 hour.",
      "Reset Password",
      link
    ),
    link
  );
}
