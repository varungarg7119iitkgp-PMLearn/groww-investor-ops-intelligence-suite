import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export type { ClassValue };

/** Merge Tailwind classes safely — main utility for all components */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a booking code safely */
export function formatBookingCode(raw: string): string {
  const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `NL-${upper.slice(0, 4)}`;
}

/** Redact PII patterns (names, emails, phone numbers) */
export function redactPII(text: string): string {
  return text
    .replace(/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g, "[REDACTED]")
    .replace(/[\w.-]+@[\w.-]+\.\w{2,}/g, "[EMAIL_REDACTED]")
    .replace(/\b\d{10}\b/g, "[PHONE_REDACTED]")
    .replace(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, "[PHONE_REDACTED]");
}

/** Check if a string contains financial advice patterns */
export function containsAdvice(text: string): boolean {
  const advicePatterns = [
    /\bshould (buy|sell|invest|hold)\b/i,
    /\brecommend(s)? (buying|selling|investing)\b/i,
    /\bbest fund (for|to)\b/i,
    /\byou (should|must|need to) invest\b/i,
    /\bguaranteed returns?\b/i,
    /\bwill (definitely|certainly) (grow|increase|double)\b/i,
  ];
  return advicePatterns.some((p) => p.test(text));
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/** Format currency values (INR) */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a date string to display format */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Sleep utility for async flows */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a random NL-XXXX booking code */
export function generateBookingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "NL-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
