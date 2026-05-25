/**
 * Booking Status Query — Phase 14
 *
 * Detects investor questions about booking status and builds a
 * grounded 6-bullet response from approval_queue / shared state.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type { ChatAnswer } from "@/app/api/chat/route";

const BOOKING_CODE_RE = /\bNL-[A-Z0-9]{4}\b/i;

const STATUS_QUERY_PATTERNS = [
  /\bbooking\s+status\b/i,
  /\bstatus\s+of\s+my\s+booking\b/i,
  /\bwhat(?:'s| is)\s+(?:the\s+)?status\b/i,
  /\bwhere\s+is\s+my\s+appointment\b/i,
  /\bmy\s+booking\s+code\b/i,
  /\bNL-[A-Z0-9]{4}\b/i,
];

export function isBookingStatusQuery(query: string): boolean {
  return STATUS_QUERY_PATTERNS.some((re) => re.test(query));
}

function mapDbStatus(status: string): "pending" | "approved" | "rejected" {
  if (status === "authorized" || status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

function labelForStatus(status: "pending" | "approved" | "rejected"): string {
  switch (status) {
    case "approved":
      return "Approved — calendar event created by advisor";
    case "rejected":
      return "Rejected — advisor overrode the booking request";
    default:
      return "Pending review — awaiting advisor authorization in Director Ops";
  }
}

interface ApprovalRow {
  booking_code: string;
  topic: string;
  proposed_slot: string;
  status: string;
  override_reason: string | null;
}

export async function buildBookingStatusAnswer(
  query: string,
  clientStatuses?: Record<string, "pending" | "approved" | "rejected">,
): Promise<ChatAnswer> {
  const codeMatch = query.match(BOOKING_CODE_RE);
  const supabase = getSupabaseClient();

  let rows: ApprovalRow[] = [];
  if (codeMatch) {
    const { data } = await supabase
      .from("approval_queue")
      .select("booking_code, topic, proposed_slot, status, override_reason")
      .eq("booking_code", codeMatch[0].toUpperCase())
      .order("created_at", { ascending: false })
      .limit(1);
    rows = (data as ApprovalRow[]) ?? [];
  } else {
    const { data } = await supabase
      .from("approval_queue")
      .select("booking_code, topic, proposed_slot, status, override_reason")
      .order("created_at", { ascending: false })
      .limit(5);
    rows = (data as ApprovalRow[]) ?? [];
  }

  if (rows.length === 0) {
    const storeCodes = clientStatuses ? Object.keys(clientStatuses) : [];
    if (storeCodes.length > 0) {
      const bullets = storeCodes.slice(0, 6).map((code) => {
        const st = clientStatuses![code] ?? "pending";
        return `${code}: ${labelForStatus(st)}`;
      });
      while (bullets.length < 6) {
        bullets.push("No additional booking records found in the approval queue.");
      }
      return {
        summary: "Here is the booking status from your session state:",
        bullets: bullets.slice(0, 6),
        citations: [],
        inScope: true,
        complianceFlag: "ok",
      };
    }

    return {
      summary: "No booking records found for your session.",
      bullets: [
        "No booking code has been generated in this session yet.",
        "Book an advisor appointment via the voice orb or text chat.",
        "After booking, you will receive a code in the format NL-XXXX.",
        "Switch to Director Ops to see pending items in the HITL queue.",
        "You can ask again with your booking code, e.g. 'Status of NL-X7K2'.",
        "This response is informational — not investment advice.",
      ],
      citations: [],
      inScope: true,
      complianceFlag: "ok",
    };
  }

  const primary = rows[0];
  const mapped =
    clientStatuses?.[primary.booking_code] ?? mapDbStatus(primary.status);

  const bullets = [
    `Booking code ${primary.booking_code} — topic: ${primary.topic.replace(/_/g, " ")}.`,
    `Proposed slot: ${new Date(primary.proposed_slot).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
    `Current status: ${labelForStatus(mapped)}.`,
    primary.override_reason
      ? `Override reason: ${primary.override_reason}`
      : "No override reason recorded.",
    rows.length > 1
      ? `Additional recent bookings: ${rows.slice(1, 4).map((r) => r.booking_code).join(", ")}.`
      : "This is your most recent booking in the approval queue.",
    "Status updates sync from Director Ops HITL authorization in real time.",
  ];

  return {
    summary: `Booking ${primary.booking_code} is currently ${mapped}.`,
    bullets,
    citations: [],
    inScope: true,
    complianceFlag: "ok",
  };
}
