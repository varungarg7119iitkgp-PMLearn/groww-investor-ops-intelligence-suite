/**
 * Phase 16 — TacticalHUDMap UI render tests
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TacticalHUDMap } from "@/components/director/TacticalHUDMap";

describe("TacticalHUDMap UI", () => {
  it("renders when visible=true", () => {
    const { container } = render(<TacticalHUDMap visible={true} />);
    expect(container.querySelector(".tactical-hud-map")).not.toBeNull();
  });

  it("does not render map layer when visible=false", () => {
    const { container } = render(<TacticalHUDMap visible={false} />);
    expect(container.querySelector(".tactical-hud-map")).toBeNull();
  });

  it("includes city labels in SVG", () => {
    const { container } = render(<TacticalHUDMap visible={true} />);
    const text = container.textContent ?? "";
    expect(text).toContain("Mumbai");
    expect(text).toContain("Delhi");
  });

  it("is aria-hidden decorative", () => {
    const { container } = render(<TacticalHUDMap visible={true} />);
    const root = container.querySelector(".tactical-hud-map");
    expect(root?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("AuroraMesh hideOrbs", () => {
  it("renders without error when hideOrbs=true", async () => {
    const { AuroraMesh } = await import("@/components/shared/AuroraMesh");
    const { container } = render(<AuroraMesh hideOrbs={true} />);
    expect(container.querySelector(".aurora-root")).not.toBeNull();
  });
});
