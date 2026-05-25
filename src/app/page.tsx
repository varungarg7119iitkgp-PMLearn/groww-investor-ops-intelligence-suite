/**
 * Single entry point — Phase 6 (Mode Switcher & Global Navigation)
 *
 * Per Requirement 1.7 ("THE application SHALL provide exactly one URL
 * entry point. No separate routes or pages SHALL exist for the two
 * modes") this page is the *only* route the user ever lands on.
 *
 * Composition:
 *   1. AuroraMesh — cinematic background, color shifts via activeMode
 *   2. ModeToggle — neumorphic switch in Knowledge Hub header (Investor / Director)
 *   3. ModeTransition — orchestrates the 400ms cross-mode swap
 *      (scanning-line sweep + fade swap between consoles)
 *
 * Mode → URL sync:
 *   - `?mode=director` on first load activates Director Ops without
 *     animating in (legacy `/director-ops` route redirects here).
 *   - Subsequent toggles do *not* push history entries — single URL.
 */

"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import {
  AuroraMesh,
  ModeTransition,
  CrossPillarSync,
} from "@/components/shared";
import { TacticalHUDMap } from "@/components/director";
import { InvestorTerminal } from "@/components/investor-terminal";
import { DirectorOpsConsole } from "@/components/director-ops";
import { useUIStore, readPersistedMode } from "@/lib/store";

/**
 * Inner component — reads `?mode=` from the URL on mount and seeds
 * the Zustand store accordingly. Must live inside a Suspense boundary
 * because `useSearchParams` opts the tree out of static rendering.
 */
function ModeURLSync() {
  const params        = useSearchParams();
  const setActiveMode = useUIStore((s) => s.setActiveMode);

  useEffect(() => {
    const param = params?.get("mode");
    if (param === "director" || param === "director-ops") {
      setActiveMode("director-ops");
      return;
    }
    if (param === "investor" || param === "investor-terminal") {
      setActiveMode("investor-terminal");
      return;
    }
    const persisted = readPersistedMode();
    if (persisted) setActiveMode(persisted);
    /* No-op otherwise — store default ("investor-terminal") wins */
  }, [params, setActiveMode]);

  return null;
}

export default function RootEntry() {
  const activeMode = useUIStore((s) => s.activeMode);
  const isDirector = activeMode === "director-ops";

  return (
    <>
      <AuroraMesh hideOrbs={isDirector} />
      <TacticalHUDMap visible={isDirector} />

      <Suspense fallback={null}>
        <ModeURLSync />
      </Suspense>

      <CrossPillarSync />

      <ModeTransition
        investorContent={<InvestorTerminal />}
        directorContent={<DirectorOpsConsole />}
      />
    </>
  );
}
