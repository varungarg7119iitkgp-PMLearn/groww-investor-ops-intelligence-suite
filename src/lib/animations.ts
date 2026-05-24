/**
 * All Framer Motion variants — Investor Ops & Intelligence Suite
 * Source: UI/UX Spec §7 (Animation Specifications)
 *
 * Import from @/lib/animations everywhere in the codebase.
 * DO NOT define motion variants inline in components — use this file.
 */

import type { Variants } from "framer-motion";

/* ── §7.1 Panel Entrance — Holographic Slide-Up ─────────── */
export const panelVariant: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ── §7.2 Terminal Typewriter — Container ────────────────── */
export const sentenceVariant: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.015 },
  },
};

/* ── §7.2 Terminal Typewriter — Individual Character ──────── */
export const letterVariant: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 },
};

/* ── §7.3 Mode Transition — Scanning Line ────────────────── */
export const scanLineVariant: Variants = {
  initial: { x: "-100%" },
  animate: {
    x: "100%",
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ── §7.5 Action Gate — Button Press ─────────────────────── */
export const buttonPressVariant: Variants = {
  tap: { scale: 0.97, transition: { duration: 0.15 } },
};

/* ── Mode Content — Fade In/Out during transitions ─────────── */
export const modeContentVariant: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ── Mode Switcher — Pill Slide ─────────────────────────── */
export const pillVariant: Variants = {
  investor: {
    x: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  director: {
    x: "100%",
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
};

/* ── Bullet Response — Sequential Appearance ─────────────── */
export const bulletContainerVariant: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

export const bulletItemVariant: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

/* ── Citation Tag — Hover Glow ───────────────────────────── */
export const citationTagVariant: Variants = {
  idle: { scale: 1, opacity: 0.8 },
  hover: {
    scale: 1.05,
    opacity: 1,
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ── Action Gate Flash — Authorize (Emerald) ─────────────── */
export const authorizeFlashVariant: Variants = {
  idle: { boxShadow: "none" },
  flash: {
    boxShadow: "0 0 20px rgba(0, 230, 118, 0.6)",
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

/* ── Action Gate Flash — Override (Crimson) ─────────────── */
export const overrideFlashVariant: Variants = {
  idle: { boxShadow: "none" },
  flash: {
    boxShadow: "0 0 20px rgba(255, 23, 68, 0.6)",
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

/* ── Theme Block entrance (stagger from Pulse briefing) ───── */
export const themeBlockVariant: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};

/* ── Orb state transitions ────────────────────────────────── */
export const orbCoreVariant: Variants = {
  IDLE:      { scale: 1,    opacity: 0.75 },
  LISTENING: { scale: 1.08, opacity: 1 },
  THINKING:  { scale: 0.95, opacity: 0.6 },
  SPEAKING:  { scale: 1.05, opacity: 1 },
};
