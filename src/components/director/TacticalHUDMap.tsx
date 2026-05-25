"use client";

/**
 * TacticalHUDMap — Phase 16 Director Ops background
 *
 * India-silhouette constellation with financial hub nodes and animated
 * data arcs. Decorative only (`aria-hidden`). Hidden on mobile (≤640px).
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

export interface TacticalHUDMapProps {
  visible: boolean;
  className?: string;
}

/** Normalised viewBox coordinates (0 0 1000 1200) */
const INDIA_PATH =
  "M 720 420 L 780 380 L 820 400 L 860 460 L 880 520 L 870 580 L 840 640 L 800 700 L 760 760 L 720 820 L 680 880 L 640 940 L 600 1000 L 560 1040 L 520 1080 L 480 1100 L 440 1080 L 400 1040 L 360 980 L 320 920 L 300 860 L 290 800 L 300 740 L 320 680 L 340 620 L 360 560 L 380 500 L 400 440 L 420 380 L 440 340 L 480 300 L 520 280 L 560 270 L 600 280 L 640 300 L 680 340 L 720 380 Z";

const CITIES = [
  { name: "Mumbai",    x: 320, y: 820 },
  { name: "Delhi",     x: 480, y: 320 },
  { name: "Bangalore", x: 400, y: 980 },
  { name: "Chennai",   x: 520, y: 1080 },
  { name: "Hyderabad", x: 440, y: 900 },
  { name: "Kolkata",   x: 680, y: 520 },
] as const;

/** Nine city-pair arcs per UI/UX §16.2.4 */
const ARC_PAIRS: Array<[number, number]> = [
  [0, 1], [0, 2], [1, 4], [2, 3], [0, 5],
  [1, 2], [3, 4], [0, 4], [5, 1],
];

function arcPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2;
  const my = Math.min(a.y, b.y) - 80;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}

function GridLines() {
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const y = 260 + i * 140;
    lines.push(
      <line key={`h-${i}`} x1="280" y1={y} x2="880" y2={y}
        stroke="var(--map-grid-line)" strokeWidth="0.5" strokeDasharray="4 8" />,
    );
  }
  for (let i = 0; i < 8; i++) {
    const x = 300 + i * 80;
    lines.push(
      <line key={`v-${i}`} x1={x} y1="260" x2={x} y2="1120"
        stroke="var(--map-grid-line)" strokeWidth="0.5" strokeDasharray="4 8" />,
    );
  }
  return <g>{lines}</g>;
}

export function TacticalHUDMap({ visible, className }: TacticalHUDMapProps) {
  const prefersReduced = useReducedMotion();
  const [activeArcSet, setActiveArcSet] = useState(0);

  const activeArcs = useMemo(() => {
    const start = (activeArcSet * 4) % ARC_PAIRS.length;
    const picked: Array<[number, number]> = [];
    for (let i = 0; i < 4; i++) {
      picked.push(ARC_PAIRS[(start + i) % ARC_PAIRS.length]);
    }
    return picked;
  }, [activeArcSet]);

  useEffect(() => {
    if (!visible || prefersReduced) return;
    const id = window.setInterval(() => {
      setActiveArcSet((s) => s + 1);
    }, 4500);
    return () => window.clearInterval(id);
  }, [visible, prefersReduced]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="tactical-hud-map"
          className={`tactical-hud-map ${className ?? ""}`}
          aria-hidden="true"
          initial={{ opacity: prefersReduced ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 1.2,
            ease: [0.16, 1, 0.3, 1],
            delay: prefersReduced ? 0 : 0.2,
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <svg
            viewBox="0 0 1000 1200"
            preserveAspectRatio="xMidYMin meet"
            style={{
              position: "absolute",
              left: "50%",
              top: "10%",
              transform: "translateX(-50%)",
              width: "min(65vw, 900px)",
              height: "auto",
            }}
          >
            <motion.path
              d={INDIA_PATH}
              fill="var(--map-silhouette-fill)"
              stroke="var(--map-silhouette-stroke)"
              strokeWidth="0.5"
              initial={{ opacity: prefersReduced ? 0.04 : 0 }}
              animate={{ opacity: 0.04 }}
              transition={{ duration: prefersReduced ? 0 : 2, delay: prefersReduced ? 0 : 0.6 }}
            />

            <GridLines />

            {!prefersReduced &&
              activeArcs.map(([from, to], idx) => {
                const a = CITIES[from];
                const b = CITIES[to];
                const d = arcPath(a, b);
                const bright = idx === 0;
                return (
                  <motion.path
                    key={`${from}-${to}-${activeArcSet}`}
                    d={d}
                    fill="none"
                    stroke={bright ? "var(--map-arc-active)" : "var(--map-arc-base)"}
                    strokeWidth="0.8"
                    strokeDasharray="6 10"
                    initial={{ strokeDashoffset: 120, opacity: 0 }}
                    animate={{ strokeDashoffset: 0, opacity: 1 }}
                    transition={{ duration: 3 + idx * 0.4, delay: 0.6 + idx * 0.15 }}
                    style={{ animation: `tactical-arc-travel ${4 + idx}s linear infinite` }}
                  />
                );
              })}

            {CITIES.map((city, i) => (
              <motion.g
                key={city.name}
                initial={{ opacity: prefersReduced ? 1 : 0, scale: prefersReduced ? 1 : 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: prefersReduced ? 0 : 0.35,
                  delay: prefersReduced ? 0 : 0.2 + i * 0.06,
                }}
              >
                {!prefersReduced && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r="7"
                    fill="none"
                    stroke="var(--map-node-pulse)"
                    strokeWidth="1"
                    style={{
                      animation: `tactical-node-pulse 2.4s ease-out infinite`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                )}
                <circle cx={city.x} cy={city.y} r="3" fill="var(--map-node-primary)" />
                <text
                  x={city.x}
                  y={city.y - 10}
                  textAnchor="middle"
                  fill="rgba(255, 171, 0, 0.5)"
                  fontSize="9"
                  fontFamily="var(--font-hud, monospace)"
                >
                  {city.name}
                </text>
              </motion.g>
            ))}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
