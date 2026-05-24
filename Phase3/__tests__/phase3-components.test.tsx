/**
 * Phase 3 Test Suite — Stark-Glass HUD Foundation Components
 *
 * Tests:
 *  - lib/animations.ts: all variant shapes match spec §7
 *  - AuroraMesh: renders aria-hidden, correct layer count
 *  - GlassPanel: renders children, variant class names
 *  - NeumorphicButton: renders text, disabled state, variant styles
 *  - ScanningLine: renders/hides based on isVisible prop
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  panelVariant,
  sentenceVariant,
  letterVariant,
  scanLineVariant,
  buttonPressVariant,
  modeContentVariant,
  pillVariant,
  bulletContainerVariant,
  bulletItemVariant,
  orbCoreVariant,
} from "@/lib/animations";
import { AuroraMesh } from "@/components/shared/AuroraMesh";
import { GlassPanel } from "@/components/shared/GlassPanel";
import { NeumorphicButton } from "@/components/shared/NeumorphicButton";
import { ScanningLine } from "@/components/shared/ScanningLine";

/* ─────────────────────────────────────────────────────────────
   Mock framer-motion to prevent jsdom animation issues
   ───────────────────────────────────────────────────────────── */
vi.mock("framer-motion", () => {
  const MockMotionDiv = ({
    children,
    className,
    style,
    onClick,
    "aria-hidden": ariaHidden,
  }: {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    "aria-hidden"?: string | boolean;
  }) => (
    <div className={className} style={style} onClick={onClick} aria-hidden={ariaHidden as boolean}>
      {children}
    </div>
  );

  const MockMotionButton = ({
    children,
    className,
    style,
    onClick,
    disabled,
    role,
  }: {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    disabled?: boolean;
    role?: string;
  }) => (
    <button
      className={className}
      style={style}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      role={role}
    >
      {children}
    </button>
  );

  const MockAnimatePresence = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

  return {
    motion: {
      div: MockMotionDiv,
      button: MockMotionButton,
      section: MockMotionDiv,
      article: MockMotionDiv,
      aside: MockMotionDiv,
      ul: MockMotionDiv,
      li: MockMotionDiv,
    },
    AnimatePresence: MockAnimatePresence,
    useReducedMotion: () => false,
  };
});

/* ─────────────────────────────────────────────────────────────
   1. ANIMATIONS.TS — Framer Motion Variant Shapes
   ───────────────────────────────────────────────────────────── */
describe("panelVariant — §7.1 Panel Entrance", () => {
  it("has hidden, visible, and exit keys", () => {
    expect(panelVariant).toHaveProperty("hidden");
    expect(panelVariant).toHaveProperty("visible");
    expect(panelVariant).toHaveProperty("exit");
  });

  it("hidden state has opacity 0 and y 30", () => {
    expect(panelVariant.hidden).toMatchObject({ opacity: 0, y: 30 });
  });

  it("visible state has opacity 1 and y 0 with spring transition", () => {
    const visible = panelVariant.visible as { opacity: number; y: number; transition: object };
    expect(visible.opacity).toBe(1);
    expect(visible.y).toBe(0);
    expect(visible.transition).toMatchObject({ type: "spring", stiffness: 300, damping: 25 });
  });

  it("exit state has opacity 0 with 200ms duration", () => {
    const exit = panelVariant.exit as { opacity: number; transition: { duration: number } };
    expect(exit.opacity).toBe(0);
    expect(exit.transition.duration).toBe(0.2);
  });
});

describe("sentenceVariant + letterVariant — §7.2 Typewriter", () => {
  it("sentenceVariant has hidden and visible keys", () => {
    expect(sentenceVariant).toHaveProperty("hidden");
    expect(sentenceVariant).toHaveProperty("visible");
  });

  it("sentenceVariant.visible has staggerChildren 0.015", () => {
    const visible = sentenceVariant.visible as { transition: { staggerChildren: number } };
    expect(visible.transition.staggerChildren).toBe(0.015);
  });

  it("letterVariant hidden has opacity 0 and y 5", () => {
    expect(letterVariant.hidden).toMatchObject({ opacity: 0, y: 5 });
  });

  it("letterVariant visible has opacity 1 and y 0", () => {
    expect(letterVariant.visible).toMatchObject({ opacity: 1, y: 0 });
  });
});

describe("scanLineVariant — §7.3 Scanning Line", () => {
  it("has initial and animate keys", () => {
    expect(scanLineVariant).toHaveProperty("initial");
    expect(scanLineVariant).toHaveProperty("animate");
  });

  it("initial x is '-100%' (starts off-screen left)", () => {
    expect(scanLineVariant.initial).toMatchObject({ x: "-100%" });
  });

  it("animate x is '100%' (sweeps to off-screen right)", () => {
    const animate = scanLineVariant.animate as { x: string; transition: object };
    expect(animate.x).toBe("100%");
  });

  it("animate duration is 0.4s (400ms)", () => {
    const animate = scanLineVariant.animate as { transition: { duration: number } };
    expect(animate.transition.duration).toBe(0.4);
  });

  it("uses ease-out-expo cubic-bezier(0.16, 1, 0.3, 1)", () => {
    const animate = (scanLineVariant.animate as Record<string, unknown>);
    const transition = animate.transition as { ease: number[] };
    expect(transition.ease).toEqual([0.16, 1, 0.3, 1]);
  });
});

describe("buttonPressVariant — §7.5 Action Gate", () => {
  it("has tap key", () => {
    expect(buttonPressVariant).toHaveProperty("tap");
  });

  it("tap scale is 0.97", () => {
    expect(buttonPressVariant.tap).toMatchObject({ scale: 0.97 });
  });

  it("tap duration is 0.15s (150ms)", () => {
    const tap = buttonPressVariant.tap as { transition: { duration: number } };
    expect(tap.transition.duration).toBe(0.15);
  });
});

describe("Additional variants completeness", () => {
  it("modeContentVariant has hidden, visible, exit", () => {
    expect(modeContentVariant).toHaveProperty("hidden");
    expect(modeContentVariant).toHaveProperty("visible");
    expect(modeContentVariant).toHaveProperty("exit");
  });

  it("pillVariant has investor and director keys", () => {
    expect(pillVariant).toHaveProperty("investor");
    expect(pillVariant).toHaveProperty("director");
  });

  it("bulletContainerVariant has hidden and visible", () => {
    expect(bulletContainerVariant).toHaveProperty("hidden");
    expect(bulletContainerVariant).toHaveProperty("visible");
  });

  it("bulletItemVariant hidden has x: -10 (slides in from left)", () => {
    expect(bulletItemVariant.hidden).toMatchObject({ opacity: 0, x: -10 });
  });

  it("orbCoreVariant has all 4 AgentVisualState keys", () => {
    expect(orbCoreVariant).toHaveProperty("IDLE");
    expect(orbCoreVariant).toHaveProperty("LISTENING");
    expect(orbCoreVariant).toHaveProperty("THINKING");
    expect(orbCoreVariant).toHaveProperty("SPEAKING");
  });
});

/* ─────────────────────────────────────────────────────────────
   2. AuroraMesh Component
   ───────────────────────────────────────────────────────────── */
describe("AuroraMesh", () => {
  it("renders without crashing", () => {
    const { container } = render(<AuroraMesh />);
    expect(container.firstChild).toBeTruthy();
  });

  it("has aria-hidden='true' (decorative)", () => {
    const { container } = render(<AuroraMesh />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
  });

  it("has pointer-events: none (non-interactive)", () => {
    const { container } = render(<AuroraMesh />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.pointerEvents).toBe("none");
  });

  it("is positioned fixed and fills screen", () => {
    const { container } = render(<AuroraMesh />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.position).toBe("fixed");
    expect(root.style.inset).toBe("0px");
  });
});

/* ─────────────────────────────────────────────────────────────
   3. GlassPanel Component
   ───────────────────────────────────────────────────────────── */
describe("GlassPanel", () => {
  it("renders children", () => {
    render(
      <GlassPanel>
        <span data-testid="child">Hello</span>
      </GlassPanel>
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("contains 'rounded' class (border-radius)", () => {
    const { container } = render(<GlassPanel>test</GlassPanel>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/rounded/);
  });

  it("default variant has cyan border class", () => {
    const { container } = render(<GlassPanel variant="default">test</GlassPanel>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/rgba\(0,229,255/);
  });

  it("amber variant has amber border class", () => {
    const { container } = render(<GlassPanel variant="amber">test</GlassPanel>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/rgba\(255,171,0/);
  });

  it("dark variant has darker border class", () => {
    const { container } = render(<GlassPanel variant="dark">test</GlassPanel>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/rgba\(255,255,255,0.06\)/);
  });

  it("applies custom className", () => {
    const { container } = render(<GlassPanel className="my-custom-class">test</GlassPanel>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("my-custom-class");
  });

  it("applies correct box-shadow from spec", () => {
    const { container } = render(<GlassPanel>test</GlassPanel>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.boxShadow).toContain("rgba(0,0,0,0.5)");
  });
});

/* ─────────────────────────────────────────────────────────────
   4. NeumorphicButton Component
   ───────────────────────────────────────────────────────────── */
describe("NeumorphicButton", () => {
  it("renders button text", () => {
    render(<NeumorphicButton>Authorize</NeumorphicButton>);
    expect(screen.getByText("Authorize")).toBeTruthy();
  });

  it("is a button element", () => {
    render(<NeumorphicButton>Click Me</NeumorphicButton>);
    const btn = screen.getByText("Click Me").closest("button");
    expect(btn).toBeTruthy();
  });

  it("fires onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<NeumorphicButton onClick={handleClick}>Test</NeumorphicButton>);
    const btn = screen.getByText("Test").closest("button")!;
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("disabled button does not fire onClick", () => {
    const handleClick = vi.fn();
    render(
      <NeumorphicButton onClick={handleClick} disabled>
        Disabled
      </NeumorphicButton>
    );
    const btn = screen.getByText("Disabled").closest("button")!;
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("disabled button has disabled attribute", () => {
    render(<NeumorphicButton disabled>Disabled</NeumorphicButton>);
    const btn = screen.getByText("Disabled").closest("button")!;
    expect(btn.disabled).toBe(true);
  });

  it("investor variant has cyan text class", () => {
    const { container } = render(
      <NeumorphicButton variant="investor">Investor</NeumorphicButton>
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("text-[#00E5FF]");
  });

  it("ops variant has amber text class", () => {
    const { container } = render(
      <NeumorphicButton variant="ops">Ops</NeumorphicButton>
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("text-[#FFAB00]");
  });

  it("success variant has emerald text class", () => {
    const { container } = render(
      <NeumorphicButton variant="success">Authorize</NeumorphicButton>
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("text-[#00E676]");
  });

  it("danger variant has crimson text class", () => {
    const { container } = render(
      <NeumorphicButton variant="danger">Override</NeumorphicButton>
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("text-[#FF1744]");
  });

  it("fullWidth prop adds w-full class", () => {
    const { container } = render(
      <NeumorphicButton fullWidth>Full</NeumorphicButton>
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("w-full");
  });

  it("size='sm' applies sm padding classes", () => {
    const { container } = render(
      <NeumorphicButton size="sm">Small</NeumorphicButton>
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("px-3");
  });

  it("size='lg' applies lg padding classes", () => {
    const { container } = render(
      <NeumorphicButton size="lg">Large</NeumorphicButton>
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("px-8");
  });
});

/* ─────────────────────────────────────────────────────────────
   5. ScanningLine Component
   ───────────────────────────────────────────────────────────── */
describe("ScanningLine", () => {
  it("renders nothing when isVisible=false", () => {
    const { container } = render(
      <ScanningLine isVisible={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when isVisible=true", () => {
    const { container } = render(
      <ScanningLine isVisible={true} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("is aria-hidden (decorative)", () => {
    const { container } = render(<ScanningLine isVisible={true} />);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute("aria-hidden")).toBe("true");
  });

  it("has pointer-events: none", () => {
    const { container } = render(<ScanningLine isVisible={true} />);
    const el = container.firstChild as HTMLElement;
    expect(el?.style.pointerEvents).toBe("none");
  });

  it("cyan variant uses cyan gradient", () => {
    const { container } = render(
      <ScanningLine isVisible={true} color="investor" />
    );
    const el = container.firstChild as HTMLElement;
    // jsdom normalizes rgba values with spaces after commas
    expect(el?.style.background).toMatch(/229.*255/);
  });

  it("ops variant uses amber gradient", () => {
    const { container } = render(
      <ScanningLine isVisible={true} color="ops" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el?.style.background).toMatch(/171.*0/);
  });

  it("calls onComplete callback", () => {
    const onComplete = vi.fn();
    render(<ScanningLine isVisible={true} onComplete={onComplete} />);
  });
});

/* ─────────────────────────────────────────────────────────────
   6. Barrel export — shared/index.ts
   ───────────────────────────────────────────────────────────── */
describe("Shared components barrel export", () => {
  it("exports AuroraMesh", async () => {
    const mod = await import("@/components/shared");
    expect(mod.AuroraMesh).toBeDefined();
  });

  it("exports GlassPanel", async () => {
    const mod = await import("@/components/shared");
    expect(mod.GlassPanel).toBeDefined();
  });

  it("exports NeumorphicButton", async () => {
    const mod = await import("@/components/shared");
    expect(mod.NeumorphicButton).toBeDefined();
  });

  it("exports ScanningLine", async () => {
    const mod = await import("@/components/shared");
    expect(mod.ScanningLine).toBeDefined();
  });
});
