/**
 * ModeTransition — Phase 6 (Mode Switcher & Global Navigation)
 *
 * Renders the cross-mode transition choreography described in
 * UI/UX §4.3:
 *
 *   1. ScanningLine sweeps left→right (cyan when arriving at investor,
 *      amber when arriving at director).
 *   2. Outgoing mode content fades + lifts (opacity 0, y -10).
 *   3. Incoming mode content fades in via `modeContentVariant`.
 *   4. AuroraMesh ambient hue follows the active mode (handled via
 *      a `data-mode` attribute on the wrapper for CSS-level theming).
 *
 * Children prop pattern: callers pass both `investorContent` and
 * `directorContent`; only one is mounted at a time via
 * `AnimatePresence mode="wait"`.
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { ScanningLine } from "./ScanningLine";
import { modeContentVariant } from "@/lib/animations";
import { useUIStore } from "@/lib/store";

export interface ModeTransitionProps {
  /** Rendered when `activeMode === "investor-terminal"` */
  investorContent: React.ReactNode;
  /** Rendered when `activeMode === "director-ops"` */
  directorContent: React.ReactNode;
}

export function ModeTransition({
  investorContent,
  directorContent,
}: ModeTransitionProps) {
  const activeMode      = useUIStore((s) => s.activeMode);
  const isTransitioning = useUIStore((s) => s.isTransitioning);

  /* ScanningLine fires once per transition. We piggy-back on
     `isTransitioning` which the store flips for exactly 400ms. */
  const [scanVisible, setScanVisible] = useState(false);

  useEffect(() => {
    if (isTransitioning) setScanVisible(true);
  }, [isTransitioning]);

  const isInvestor = activeMode === "investor-terminal";
  const accentColor = isInvestor ? "investor" : "ops";

  return (
    <div
      data-testid="mode-transition"
      data-mode={activeMode}
      data-transitioning={isTransitioning ? "true" : "false"}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {/* ── §4.3 step 2: Horizontal scanning-line sweep ── */}
      <ScanningLine
        isVisible={scanVisible}
        color={accentColor}
        onComplete={() => setScanVisible(false)}
      />

      {/* ── §4.3 steps 3-6: AnimatePresence swap ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeMode}
          variants={modeContentVariant}
          initial="hidden"
          animate="visible"
          exit="exit"
          data-testid={`mode-content-${activeMode}`}
          style={{
            position: "relative",
            width:    "100%",
            height:   "100%",
          }}
        >
          {isInvestor ? investorContent : directorContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
