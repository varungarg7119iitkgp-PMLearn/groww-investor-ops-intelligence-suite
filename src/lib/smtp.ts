/**
 * SMTP mailer — sends advisor confirmation emails on HITL authorize.
 *
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 * Gracefully no-ops when SMTP is not configured.
 */

import nodemailer from "nodemailer";

export interface SendMailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendMailResult {
  ok: boolean;
  error?: string;
}

function smtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (!smtpConfigured()) {
    console.warn("[smtp] SMTP not configured — email not sent");
    return { ok: false, error: "SMTP not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `Groww Advisory <${process.env.SMTP_USER}>`,
      to: input.to,
      subject: input.subject,
      text: input.body,
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[smtp] send failed:", msg);
    return { ok: false, error: msg };
  }
}

/** Send the advisor confirmation email draft after HITL authorize. */
export async function sendAdvisorConfirmationEmail(
  to: string,
  emailDraft: string,
): Promise<SendMailResult> {
  const subjectMatch = emailDraft.match(/^Subject:\s*(.+)$/m);
  const subject = subjectMatch?.[1]?.trim() ?? "Advisor Consultation Confirmation";
  const body = emailDraft.replace(/^Subject:.*\n?/m, "").trim();
  return sendMail({ to, subject, body });
}
