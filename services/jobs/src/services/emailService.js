/**
 * Email Service — Jobs Service
 *
 * Priority order (first matching wins):
 *  1. AWS SQS     → when NODE_ENV=production AND SQS_QUEUE_URL is set (AWS EC2)
 *  2. Resend API  → when RESEND_API_KEY is set (Render / any HTTPS-only host)
 *  3. SMTP        → when SMTP_HOST is set (custom mail server)
 *  4. Ethereal    → fallback for local dev (no config needed)
 *
 * All functions are best-effort — errors are logged, never thrown.
 */

import nodemailer from "nodemailer";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

// ── SQS client (AWS EC2 production) ───────────────────────────────────────────

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-1" });

async function publishToSQS(payload) {
  const command = new SendMessageCommand({
    QueueUrl:    process.env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(payload),
  });
  await sqsClient.send(command);
  console.log(`📨 SQS: queued [${payload.type}] email → ${payload.to}`);
}

// ── Fetch user details from auth service ──────────────────────────────────────

async function getUser(userId) {
  try {
    const res = await fetch(
      `${process.env.AUTH_SERVICE_URL}/api/v1/auth/internal/user/${userId}`,
      { headers: { "x-service-secret": process.env.INTERNAL_SERVICE_SECRET } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

// ── Resend API (Render / HTTPS-only environments) ─────────────────────────────

async function sendViaResend({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    "JobSphere <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Resend API error ${res.status}`);
  }

  console.log(`📧 Resend: email sent → ${to}`);
}

// ── Nodemailer transport (SMTP or Ethereal) ───────────────────────────────────

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

// ── Unified send router ───────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend({ to, subject, html });
  }
  return sendViaMail({ to, subject, html });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendInterviewEmail(userId, job) {
  try {
    const user = await getUser(userId);
    if (!user) return;

    if (process.env.NODE_ENV === "production" && process.env.SQS_QUEUE_URL) {
      await publishToSQS({
        type: "interview",
        to:   user.email,
        name: user.name,
        job:  {
          company:        job.company,
          position:       job.position,
          interviewDate:  job.interviewDate,
          interviewTime:  job.interviewTime,
          interviewType:  job.interviewType,
          interviewRound: job.interviewRound,
          interviewerName:job.interviewerName,
        },
      });
    } else {
      await sendEmail({
        to:      user.email,
        subject: `Interview Scheduled — ${job.company} 📅`,
        html:    interviewTemplate(user.name, job),
      });
    }
  } catch (err) {
    console.error("📧 sendInterviewEmail error (non-fatal):", err.message);
  }
}

export async function sendOfferEmail(userId, job) {
  try {
    const user = await getUser(userId);
    if (!user) return;

    if (process.env.NODE_ENV === "production" && process.env.SQS_QUEUE_URL) {
      await publishToSQS({
        type:     "offer",
        to:       user.email,
        name:     user.name,
        job:      { company: job.company, position: job.position },
      });
    } else {
      await sendEmail({
        to:      user.email,
        subject: `🎉 Offer Received — ${job.company}`,
        html:    offerTemplate(user.name, job),
      });
    }
  } catch (err) {
    console.error("📧 sendOfferEmail error (non-fatal):", err.message);
  }
}

// ── Email templates (used in local dev + exported for Lambda) ─────────────────

export function interviewTemplate(name, job) {
  const date = job.interviewDate
    ? new Date(job.interviewDate).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    : "TBD";

  const rows = [
    ["Company",     job.company],
    ["Position",    job.position],
    ["Date",        date],
    job.interviewTime    && ["Time",        job.interviewTime],
    job.interviewType    && ["Type",        job.interviewType],
    job.interviewRound   && ["Round",       `Round ${job.interviewRound}`],
    job.interviewerName  && ["Interviewer", job.interviewerName],
  ]
    .filter(Boolean)
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;color:#6b7280;font-size:14px;font-weight:600;border-bottom:1px solid #f3f4f6;white-space:nowrap;">${label}</td>
        <td style="padding:8px 12px;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${value}</td>
      </tr>`)
    .join("");

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#6366f1 0%,#7c3aed 100%);padding:40px 32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:12px;">📅</div>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">Interview Scheduled!</h1>
    </div>
    <div style="background:#f9fafb;padding:40px 32px;">
      <h2 style="color:#111827;margin:0 0 12px;">Hi ${name}!</h2>
      <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">You have an interview coming up:</p>
      <div style="background:white;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:28px;">
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>
      <p style="color:#6b7280;font-size:14px;text-align:center;">You've got this! 💪</p>
    </div>
  </div>`;
}

export function offerTemplate(name, job) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:40px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">🎉</div>
      <h1 style="color:white;margin:0;font-size:26px;font-weight:700;">Congratulations!</h1>
    </div>
    <div style="background:#f9fafb;padding:40px 32px;text-align:center;">
      <h2 style="color:#111827;margin:0 0 12px;">Hi ${name}!</h2>
      <p style="color:#6b7280;font-size:16px;line-height:1.7;margin:0 0 24px;">
        You received a job offer from <strong style="color:#111827;">${job.company}</strong>
        for <strong style="color:#111827;">${job.position}</strong>!
      </p>
      <p style="color:#9ca3af;font-size:13px;">Your hard work paid off! 🥂</p>
    </div>
  </div>`;
}
