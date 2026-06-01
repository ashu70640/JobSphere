/**
 * Email Service — Auth Service
 *
 * LOCAL DEV  → Nodemailer + Ethereal fake inbox (no config needed)
 * PRODUCTION → publishes a JSON event to SQS → Lambda picks it up → SES sends the email
 *
 * All functions are best-effort — errors are logged, never thrown.
 */

import nodemailer from "nodemailer";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

// ── SQS client (used in production only) ──────────────────────────────────────

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-1" });

async function publishToSQS(payload) {
  const command = new SendMessageCommand({
    QueueUrl:    process.env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(payload),
  });
  await sqsClient.send(command);
  console.log(`📨 SQS: queued [${payload.type}] email → ${payload.to}`);
}

// ── Nodemailer transport (used in local dev) ──────────────────────────────────

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    console.log("📧 Email: using SMTP →", process.env.SMTP_HOST);
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email", port: 587, secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log("📧 Email: using Ethereal →", testAccount.user);
    console.log("📧 View emails at: https://ethereal.email/messages");
  }

  return transporter;
}

async function sendViaMail({ to, subject, html }) {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: `"JobSphere" <${process.env.SMTP_USER || "noreply@jobsphere.com"}>`,
      to, subject, html,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`📧 Preview: ${previewUrl}`);
  } catch (err) {
    console.error("📧 Email error (non-fatal):", err.message);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ name, email }) {
  try {
    if (process.env.NODE_ENV === "production" && process.env.SQS_QUEUE_URL) {
      // Production — publish to SQS, Lambda handles the actual send
      await publishToSQS({
        type:         "welcome",
        to:           email,
        name,
        dashboardUrl: process.env.CLIENT_URL || "",
      });
    } else {
      // Local dev — send directly via Nodemailer
      await sendViaMail({
        to:      email,
        subject: "Welcome to JobSphere! 🚀",
        html:    welcomeTemplate(name),
      });
    }
  } catch (err) {
    console.error("📧 sendWelcomeEmail error (non-fatal):", err.message);
  }
}

// ── Email template (used in local dev + by Lambda) ────────────────────────────

export function welcomeTemplate(name, dashboardUrl = "") {
  const url = dashboardUrl || process.env.CLIENT_URL || "http://localhost:5173";

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#6366f1 0%,#7c3aed 100%);padding:40px 32px;text-align:center;">
      <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="color:white;font-size:18px;font-weight:900;">JS</span>
      </div>
      <h1 style="color:white;margin:0;font-size:26px;font-weight:700;">Welcome to JobSphere!</h1>
    </div>
    <div style="background:#f9fafb;padding:40px 32px;">
      <h2 style="color:#111827;margin:0 0 12px;">Hi ${name}! 👋</h2>
      <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 24px;">
        You've joined JobSphere — your AI-powered job application tracker.
      </p>
      <div style="background:white;border-radius:10px;padding:20px 24px;margin-bottom:28px;border:1px solid #e5e7eb;">
        <p style="color:#374151;font-weight:600;margin:0 0 12px;">Here's what you can do:</p>
        <ul style="color:#6b7280;font-size:14px;line-height:2.2;margin:0;padding-left:20px;">
          <li>📋 Track every application — status, notes, documents</li>
          <li>📅 Schedule interviews and get reminders</li>
          <li>🤖 Use AI to analyse job descriptions &amp; match your resume</li>
          <li>📊 View analytics on your job search progress</li>
        </ul>
      </div>
      <div style="text-align:center;">
        <a href="${url}" style="display:inline-block;background:#7c3aed;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
          Go to Dashboard →
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;text-align:center;margin-top:32px;">Good luck with your job search! 🍀</p>
    </div>
  </div>`;
}
