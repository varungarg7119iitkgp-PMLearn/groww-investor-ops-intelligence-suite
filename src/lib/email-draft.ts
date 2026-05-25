/**
 * Email Draft Generation — Phase 13
 *
 * Auto-generates an advisor confirmation email combining booking details
 * with the latest market context snippet from the Weekly Pulse.
 */

import type { TopicType } from "@/types";

export interface EmailDraftInput {
  bookingCode: string;
  topic: TopicType;
  proposedSlot: string;
  investorNameRedacted: string;
  advisorEmail: string;
  userContext?: string;
  marketContextSnippet?: string;
}

const TOPIC_LABELS: Record<TopicType, string> = {
  kyc: "KYC Documentation",
  sip: "SIP / Systematic Investment Plan",
  statements: "Account Statements",
  withdrawals: "Withdrawals & Redemptions",
  account_changes: "Account Changes & Nominee Updates",
};

/**
 * Generate a professional email draft for the advisor to review/edit.
 * Incorporates market context if available from the latest pulse.
 */
export function generateEmailDraft(input: EmailDraftInput): string {
  const topicLabel = TOPIC_LABELS[input.topic] ?? input.topic;
  const slotFormatted = formatSlot(input.proposedSlot);

  const contextBlock = input.marketContextSnippet
    ? `\n\n--- Market Context (from Weekly Pulse) ---\n${input.marketContextSnippet}\n---`
    : "";

  const userNotes = input.userContext
    ? `\nInvestor Notes: ${input.userContext}`
    : "";

  return [
    `Subject: Advisor Consultation Confirmation — ${input.bookingCode}`,
    ``,
    `Dear ${input.investorNameRedacted},`,
    ``,
    `This email confirms your upcoming advisory consultation:`,
    ``,
    `• Booking Code: ${input.bookingCode}`,
    `• Topic: ${topicLabel}`,
    `• Scheduled: ${slotFormatted}`,
    `• Advisor: ${input.advisorEmail}`,
    userNotes,
    ``,
    `Please ensure you have the following ready:`,
    `- Government-issued photo ID`,
    `- Any relevant account documents related to "${topicLabel}"`,
    ``,
    `If you need to reschedule, please contact us with your booking code.`,
    contextBlock,
    ``,
    `Best regards,`,
    `Groww Advisory Team`,
    ``,
    `---`,
    `Disclaimer: This communication is informational and does not constitute investment advice.`,
  ].join("\n");
}

function formatSlot(isoSlot: string): string {
  try {
    const d = new Date(isoSlot);
    if (Number.isNaN(d.getTime())) return isoSlot;
    return d.toLocaleString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return isoSlot;
  }
}
