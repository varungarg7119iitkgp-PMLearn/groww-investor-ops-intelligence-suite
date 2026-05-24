/**
 * Voice Tools — Phase 10
 *
 * Gemini Function Calling declarations + dispatcher for the three
 * voice-agent tools:
 *
 *   1. get_preparation_docs(topic, query?)
 *   2. generate_booking_code_and_notes(topic, contextNotes, proposedSlot)
 *   3. create_calendar_event(payload)
 *
 * Phase 11's `gemini.chat()` wrapper will register these declarations
 * with the model and invoke `executeVoiceToolCall()` when the model
 * returns a `functionCall` part.
 *
 * NOTE: Gemini's TypeScript SDK uses an enum `SchemaType` for the
 * `type` field. To keep this module test-friendly and to avoid a hard
 * dependency on the SDK in pure-logic tests, we declare the schemas
 * using plain string literals ("OBJECT", "STRING", etc.). The
 * adapter layer in `gemini.ts` (Phase 11) maps these to SDK enums.
 */

import type { TopicType, CalendarEventPayload, BookingCode } from "@/types";
import { VALID_TOPICS, BOOKING_CODE_REGEX } from "@/types";
import { getPreparationDocs } from "@/tools/preparation-retriever";
import {
  generateBookingCodeAndNotes,
  type GenerateBookingArgs,
} from "@/tools/notes-extractor";
import { createCalendarEvent, buildCalendarPayload } from "@/tools/calendar";

/* ════════════════════════════════════════════════════════════════════
   FUNCTION DECLARATIONS (Gemini Function Calling schema)
   ════════════════════════════════════════════════════════════════════ */

export const VOICE_FUNCTION_DECLARATIONS = [
  {
    name: "get_preparation_docs",
    description:
      "Retrieve preparation documents for one of the 5 consultation topics. Use when the user asks for info to prepare for an advisor call.",
    parameters: {
      type: "OBJECT",
      properties: {
        topic: {
          type: "STRING",
          description: "One of: kyc, sip, statements, withdrawals, account_changes",
          enum: [...VALID_TOPICS],
        },
        query: {
          type: "STRING",
          description: "Optional keyword filter within the topic",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "generate_booking_code_and_notes",
    description:
      "Generate a unique booking code (NL-XXXX) and PII-scrubbed notes once topic, context and slot are collected. Always call this BEFORE create_calendar_event.",
    parameters: {
      type: "OBJECT",
      properties: {
        sessionId: {
          type: "STRING",
          description: "Session id from the ConversationState",
        },
        topic: {
          type: "STRING",
          enum: [...VALID_TOPICS],
        },
        contextNotes: {
          type: "STRING",
          description: "Free-text context captured from the user (will be PII-scrubbed before storage)",
        },
        proposedSlot: {
          type: "STRING",
          description: "ISO-8601 slot the user picked (one of the 2 from generateMockSlots)",
        },
        advisorEmail: {
          type: "STRING",
          description: "Optional advisor email override",
        },
      },
      required: ["sessionId", "topic", "contextNotes", "proposedSlot"],
    },
  },
  {
    name: "create_calendar_event",
    description:
      "Create the Google Calendar event ONLY after explicit user confirmation. Pass the booking summary fields returned by generate_booking_code_and_notes.",
    parameters: {
      type: "OBJECT",
      properties: {
        bookingCode: { type: "STRING", description: "Format: NL-XXXX" },
        topic: { type: "STRING", enum: [...VALID_TOPICS] },
        proposedSlot: { type: "STRING", description: "ISO-8601 start time" },
        contextNotes: { type: "STRING" },
        advisorEmail: { type: "STRING" },
        investorNameRedacted: { type: "STRING" },
      },
      required: ["bookingCode", "topic", "proposedSlot"],
    },
  },
] as const;

export type VoiceToolName = (typeof VOICE_FUNCTION_DECLARATIONS)[number]["name"];

/* ════════════════════════════════════════════════════════════════════
   DISPATCHER — invoked by Phase 11 chat() loop
   ════════════════════════════════════════════════════════════════════ */

export interface VoiceToolCallContext {
  /** Conversation session id — used for booking-code uniqueness */
  sessionId: string;
}

export interface VoiceToolCallResult {
  ok: boolean;
  toolName: VoiceToolName | string;
  /** JSON-serializable payload returned to Gemini for next-turn use */
  output: Record<string, unknown>;
  error?: string;
}

/**
 * Dispatch a single Gemini function call to the correct tool. Inputs
 * are sanitized lightly (string coercion + topic validation) before
 * the tool is invoked.
 */
export async function executeVoiceToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: VoiceToolCallContext,
): Promise<VoiceToolCallResult> {
  try {
    switch (name) {
      case "get_preparation_docs": {
        const topic = String(args.topic ?? "") as TopicType;
        const query = args.query !== undefined ? String(args.query) : undefined;
        if (!(VALID_TOPICS as readonly string[]).includes(topic)) {
          return {
            ok: false,
            toolName: name,
            output: { found: false, documents: [] },
            error: `Invalid topic: ${topic}`,
          };
        }
        const result = await getPreparationDocs(topic, { query });
        return {
          ok: true,
          toolName: name,
          output: {
            topic: result.topic,
            found: result.found,
            documents: result.documents,
            scores: result.scores,
            retrievedAt: result.retrievedAt,
          },
        };
      }

      case "generate_booking_code_and_notes": {
        const bookingArgs: GenerateBookingArgs = {
          sessionId: String(args.sessionId ?? ctx.sessionId),
          topic: String(args.topic ?? "") as TopicType,
          contextNotes: String(args.contextNotes ?? ""),
          proposedSlot: String(args.proposedSlot ?? ""),
          advisorEmail: args.advisorEmail ? String(args.advisorEmail) : undefined,
          investorName: args.investorName ? String(args.investorName) : undefined,
        };
        if (!(VALID_TOPICS as readonly string[]).includes(bookingArgs.topic)) {
          return {
            ok: false,
            toolName: name,
            output: {},
            error: `Invalid topic: ${bookingArgs.topic}`,
          };
        }
        const summary = generateBookingCodeAndNotes(bookingArgs);
        return {
          ok: true,
          toolName: name,
          output: { ...summary },
        };
      }

      case "create_calendar_event": {
        const code = String(args.bookingCode ?? "");
        if (!BOOKING_CODE_REGEX.test(code)) {
          return {
            ok: false,
            toolName: name,
            output: {},
            error: `Invalid bookingCode: ${code}`,
          };
        }
        const topic = String(args.topic ?? "") as TopicType;
        const proposedSlot = String(args.proposedSlot ?? "");
        const contextNotes = String(args.contextNotes ?? "");

        /* Build the calendar payload from the args. We re-use the
         * `buildCalendarPayload` helper by constructing a minimal
         * BookingSummary shape. */
        const payload: CalendarEventPayload = buildCalendarPayload({
          bookingCode: code as BookingCode,
          investorNameRedacted: String(args.investorNameRedacted ?? "[REDACTED]"),
          topic,
          proposedSlot,
          advisorEmail: String(args.advisorEmail ?? "advisor@groww.in"),
          status: "pending_review",
          contextNotes,
        });

        const result = await createCalendarEvent(payload);
        return {
          ok: result.status !== "tentative",
          toolName: name,
          output: { ...result },
        };
      }

      default:
        return {
          ok: false,
          toolName: name,
          output: {},
          error: `Unknown tool: ${name}`,
        };
    }
  } catch (err) {
    return {
      ok: false,
      toolName: name,
      output: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
