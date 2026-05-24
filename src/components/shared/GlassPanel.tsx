"use client";

import { motion, useReducedMotion } from "framer-motion";
import { panelVariant } from "@/lib/animations";
import { cn } from "@/lib/utils";

export type GlassPanelVariant = "default" | "dark" | "amber";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  /**
   * default — cyan border (Investor Terminal)
   * dark    — dimmed, lower contrast
   * amber   — Tactical Amber border (Director Ops)
   */
  variant?: GlassPanelVariant;
  /** Skip entrance animation — useful for panels that should appear instantly */
  noEntrance?: boolean;
  /** Override the motion animation control externally */
  animate?: string;
  as?: "div" | "section" | "article" | "aside";
}

const VARIANT_STYLES: Record<GlassPanelVariant, string> = {
  default:
    "border-[rgba(0,229,255,0.15)] bg-[rgba(10,15,30,0.4)] hover:border-[rgba(0,229,255,0.25)]",
  dark:
    "border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.6)] hover:border-[rgba(255,255,255,0.10)]",
  amber:
    "border-[rgba(255,171,0,0.2)] bg-[rgba(20,12,5,0.4)] hover:border-[rgba(255,171,0,0.35)]",
};

/**
 * GlassPanel — Primary glassmorphism container
 *
 * Specs: UI/UX §3.1 Material Physics (Glass Panel)
 *  - Background: rgba(10, 15, 30, 0.4)
 *  - Backdrop blur: 24px
 *  - Border: 1px solid rgba(0,229,255,0.15) → brightens to 0.25 on hover
 *  - Outer shadow: 0 12px 40px -12px rgba(0,0,0,0.5)
 *  - Inner shadow: inset 0 1px 0 rgba(255,255,255,0.05)
 *  - Border radius: 20px
 *  - Entrance: panelVariant spring (stiffness 300, damping 25)
 */
export function GlassPanel({
  children,
  className,
  variant = "default",
  noEntrance = false,
  animate,
  as: Tag = "div",
}: GlassPanelProps) {
  const prefersReduced = useReducedMotion();

  const MotionTag = motion[Tag] as typeof motion.div;

  const motionProps = noEntrance || prefersReduced
    ? {}
    : {
        variants: panelVariant,
        initial: "hidden",
        animate: animate ?? "visible",
        exit: "exit",
      };

  return (
    <MotionTag
      {...motionProps}
      className={cn(
        /* Glass base */
        "relative rounded-[20px] border backdrop-blur-[24px]",
        /* Transition for hover border brightening */
        "transition-[border-color,box-shadow] duration-200",
        /* Variant-specific colours */
        VARIANT_STYLES[variant],
        className
      )}
      style={{
        boxShadow:
          "0 12px 40px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {children}
    </MotionTag>
  );
}
