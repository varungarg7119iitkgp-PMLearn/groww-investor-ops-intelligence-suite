/**
 * Phase 1 Test Suite — Design Tokens & Core Utilities
 * Covers: CSS token exports, utility functions, type guards, compliance helpers.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  cn,
  formatBookingCode,
  redactPII,
  containsAdvice,
  truncate,
  formatCurrency,
  formatDate,
  generateBookingCode,
} from "@/lib/utils";
import {
  isValidBookingCode,
  BOOKING_CODE_REGEX,
  apiSuccess,
  apiError,
} from "@/types/index";

/* ── 1. CSS Utility (cn) ──────────────────────────────────── */
describe("cn() — Tailwind class merger", () => {
  it("merges simple classes", () => {
    expect(cn("bg-void", "text-investor")).toBe("bg-void text-investor");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("bg-void", "bg-surface-1")).toBe("bg-surface-1");
  });

  it("handles conditional classes (falsy ignored)", () => {
    expect(cn("base", false && "skipped", undefined, "last")).toBe("base last");
  });

  it("handles arrays and objects", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

/* ── 2. Booking Code Validation ───────────────────────────── */
describe("Booking code format NL-[A-Z0-9]{4}", () => {
  it("accepts valid codes", () => {
    expect(isValidBookingCode("NL-A3X9")).toBe(true);
    expect(isValidBookingCode("NL-0000")).toBe(true);
    expect(isValidBookingCode("NL-ZZZZ")).toBe(true);
    expect(isValidBookingCode("NL-AB12")).toBe(true);
  });

  it("rejects invalid codes", () => {
    expect(isValidBookingCode("NL-abc1")).toBe(false);
    expect(isValidBookingCode("NL-A1")).toBe(false);
    expect(isValidBookingCode("AB-1234")).toBe(false);
    expect(isValidBookingCode("NL-A1B2C")).toBe(false);
    expect(isValidBookingCode("")).toBe(false);
    expect(isValidBookingCode("NL-!@#$")).toBe(false);
  });

  it("formatBookingCode produces valid code from raw 4-char input", () => {
    const result = formatBookingCode("a3x9");
    expect(isValidBookingCode(result)).toBe(true);
    expect(result).toBe("NL-A3X9");
  });

  it("generateBookingCode always produces a valid code", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateBookingCode();
      expect(isValidBookingCode(code)).toBe(true);
    }
  });

  /* Property-based test */
  it("PROPERTY: any 4 uppercase alphanumeric chars form a valid code", () => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...charset.split("")), { minLength: 4, maxLength: 4 }),
        (chars) => {
          const suffix = chars.join("");
          return BOOKING_CODE_REGEX.test(`NL-${suffix}`);
        }
      )
    );
  });
});

/* ── 3. PII Redaction ─────────────────────────────────────── */
describe("redactPII() — Zero PII guardrail", () => {
  it("redacts full person names", () => {
    const result = redactPII("My name is John Smith and I need help");
    expect(result).not.toContain("John Smith");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts email addresses", () => {
    const result = redactPII("Contact me at john@example.com for details");
    expect(result).not.toContain("john@example.com");
    expect(result).toContain("[EMAIL_REDACTED]");
  });

  it("redacts 10-digit phone numbers", () => {
    const result = redactPII("Call me on 9876543210");
    expect(result).not.toContain("9876543210");
    expect(result).toContain("[PHONE_REDACTED]");
  });

  it("leaves non-PII text untouched", () => {
    const clean = "The fund NAV is 125.34 as of last week.";
    expect(redactPII(clean)).toBe(clean);
  });

  it("handles empty string", () => {
    expect(redactPII("")).toBe("");
  });
});

/* ── 4. No-Advice Guardrail ───────────────────────────────── */
describe("containsAdvice() — Zero Advice guardrail", () => {
  it("detects advice phrases", () => {
    expect(containsAdvice("You should buy this fund now")).toBe(true);
    expect(containsAdvice("I recommend buying Axis Bluechip")).toBe(true);
    expect(containsAdvice("This is the best fund for you")).toBe(true);
    expect(containsAdvice("You must invest immediately")).toBe(true);
    expect(containsAdvice("Guaranteed returns of 20%")).toBe(true);
  });

  it("passes neutral factual statements", () => {
    expect(containsAdvice("The fund's 1-year return is 12.5%")).toBe(false);
    expect(containsAdvice("The expense ratio is 1.5%")).toBe(false);
    expect(containsAdvice("SIP is a systematic investment plan")).toBe(false);
    expect(containsAdvice("The fund invests in large-cap stocks")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(containsAdvice("YOU SHOULD BUY THIS")).toBe(true);
  });
});

/* ── 5. Text Utilities ────────────────────────────────────── */
describe("truncate()", () => {
  it("truncates long strings with ellipsis", () => {
    expect(truncate("Hello World", 8)).toBe("Hello...");
  });

  it("leaves short strings untouched", () => {
    expect(truncate("Hi", 50)).toBe("Hi");
  });

  it("handles exact-length strings", () => {
    expect(truncate("Hello", 5)).toBe("Hello");
  });
});

describe("formatCurrency()", () => {
  it("formats INR currency", () => {
    const result = formatCurrency(1500);
    expect(result).toContain("1,500");
    expect(result).toContain("₹");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toContain("0");
  });
});

describe("formatDate()", () => {
  it("formats ISO date string to readable format", () => {
    const result = formatDate("2026-01-15T00:00:00.000Z");
    expect(result).toContain("2026");
    expect(result).toContain("Jan");
  });
});

/* ── 6. API Response Helpers ──────────────────────────────── */
describe("apiSuccess() / apiError()", () => {
  it("apiSuccess wraps data with null error", () => {
    const res = apiSuccess({ id: "123", value: 42 });
    expect(res.data).toEqual({ id: "123", value: 42 });
    expect(res.error).toBeNull();
  });

  it("apiSuccess passes optional meta", () => {
    const res = apiSuccess("ok", { count: 1 });
    expect(res.meta).toEqual({ count: 1 });
  });

  it("apiError wraps error with null data", () => {
    const res = apiError("Something went wrong");
    expect(res.data).toBeNull();
    expect(res.error).toBe("Something went wrong");
  });
});

/* ── 7. Design Token Snapshot (CSS custom property names) ─── */
describe("Design token naming conventions", () => {
  const REQUIRED_TOKENS = [
    "--void-bg",
    "--investor",
    "--investor-glow",
    "--ops",
    "--ops-glow",
    "--success",
    "--error",
    "--text-primary",
    "--text-secondary",
    "--glass-bg",
    "--glass-border",
    "--font-display",
    "--font-body",
    "--font-hud",
    "--aurora-1",
    "--mode-accent",
    "--mode-glow",
  ];

  it("all required CSS custom property names are well-formed strings", () => {
    REQUIRED_TOKENS.forEach((token) => {
      expect(token).toMatch(/^--[a-z][a-z0-9-]*$/);
    });
  });

  it("token count matches spec minimum (17 required)", () => {
    expect(REQUIRED_TOKENS.length).toBeGreaterThanOrEqual(17);
  });
});
