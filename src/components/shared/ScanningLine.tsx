"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { scanLineVariant } from "@/lib/animations";

interface ScanningLineProps {
  /** Whether to show/animate the scanning line */
  isVisible: boolean;
  /** Accent colour for the gradient tip (default: Arc Cyan) */
  color?: "investor" | "ops";
  /** Callback when the animation completes */
  onComplete?: () => void;
}

const GRADIENT: Record<"investor" | "ops", string> = {
  investor:
    "linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.05) 30%, rgba(0,229,255,0.9) 50%, rgba(0,229,255,0.05) 70%, transparent 100%)",
  ops: "linear-gradient(90deg, transparent 0%, rgba(255,171,0,0.05) 30%, rgba(255,171,0,0.9) 50%, rgba(255,171,0,0.05) 70%, transparent 100%)",
};

/**
 * ScanningLine — Mode transition horizontal sweep
 *
 * Specs: UI/UX §4.3 Transition Animation
 *  - 1px height, full viewport width
 *  - White→cyan (or amber) gradient tip
 *  - Duration: 400ms, ease: cubic-bezier(0.16, 1, 0.3, 1)
 *  - Triggered on mode switch, calls onComplete when done
 *  - prefers-reduced-motion: line hidden entirely
 */
export function ScanningLine({
  isVisible,
  color = "investor",
  onComplete,
}: ScanningLineProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="scanning-line"
          variants={scanLineVariant}
          initial="initial"
          animate="animate"
          onAnimationComplete={onComplete}
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            zIndex: 999,
            background: GRADIENT[color],
            pointerEvents: "none",
          }}
        />
      )}
    </AnimatePresence>
  );
}
