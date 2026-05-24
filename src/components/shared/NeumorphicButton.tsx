"use client";

import { motion, useReducedMotion } from "framer-motion";
import { buttonPressVariant } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { ReactNode, ButtonHTMLAttributes } from "react";

type NeuButtonVariant = "default" | "investor" | "ops" | "success" | "danger";
type NeuButtonSize = "sm" | "md" | "lg";

interface NeumorphicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: NeuButtonVariant;
  size?: NeuButtonSize;
  /** Full-width button */
  fullWidth?: boolean;
  /** Show a glow flash animation on click */
  glowOnClick?: boolean;
}

const VARIANT_STYLES: Record<NeuButtonVariant, string> = {
  default:
    "text-[#E8EEF6] border-[rgba(255,255,255,0.06)]",
  investor:
    "text-[#00E5FF] border-[rgba(0,229,255,0.15)]",
  ops:
    "text-[#FFAB00] border-[rgba(255,171,0,0.2)]",
  success:
    "text-[#00E676] border-[rgba(0,230,118,0.2)]",
  danger:
    "text-[#FF1744] border-[rgba(255,23,68,0.2)]",
};

const SIZE_STYLES: Record<NeuButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs tracking-[0.05em]",
  md: "px-5 py-2.5 text-[14px] tracking-[0.02em]",
  lg: "px-8 py-3 text-[16px] tracking-[0.03em]",
};

/**
 * NeumorphicButton — 3-state interactive control
 *
 * Specs: UI/UX §3.1 Material Physics (Neumorphic Button)
 *  Raised:  bg rgba(20,25,40,0.6), shadow: 4px 4px 12px rgba(0,0,0,0.4), -2px -2px 8px rgba(255,255,255,0.03)
 *  Pressed: bg rgba(10,15,25,0.8), inset shadow 2px 2px 6px rgba(0,0,0,0.4), scale(0.97)
 *  Hover:   border brightens, subtle lift
 *  Transition: 150ms ease-out
 */
export function NeumorphicButton({
  children,
  variant = "default",
  size = "md",
  fullWidth = false,
  disabled = false,
  className,
  onClick,
  ...rest
}: NeumorphicButtonProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.button
      variants={buttonPressVariant}
      whileTap={prefersReduced || disabled ? undefined : "tap"}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        /* Base layout */
        "relative inline-flex items-center justify-center select-none",
        "rounded-lg border font-display font-medium uppercase",
        /* Transition for hover/active states */
        "transition-all duration-150",
        /* Default neumorphic raised state */
        !disabled && "cursor-pointer",
        disabled && "cursor-not-allowed opacity-40",
        /* Variant */
        VARIANT_STYLES[variant],
        /* Size */
        SIZE_STYLES[size],
        /* Full-width */
        fullWidth && "w-full",
        className
      )}
      style={
        disabled
          ? {
              background: "rgba(15, 20, 30, 0.4)",
              boxShadow: "none",
            }
          : {
              background: "rgba(20, 25, 40, 0.6)",
              boxShadow:
                "4px 4px 12px rgba(0,0,0,0.4), -2px -2px 8px rgba(255,255,255,0.03)",
            }
      }
      {...(rest as object)}
    >
      {/* Hover overlay — brightens the button surface */}
      {!disabled && (
        <span
          className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-150 hover:opacity-100"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
