/**
 * /director-ops legacy route — Phase 6 redirect shim
 *
 * Per Requirement 1.7 ("THE application SHALL provide exactly one URL
 * entry point") this route no longer renders the Director Ops console.
 * Instead it permanently redirects to `/?mode=director` so the single
 * root route can render the appropriate console from Zustand state.
 *
 * The Director Ops UI moved to `@/components/director-ops/DirectorOpsConsole`
 * and is rendered by `src/app/page.tsx` via the ModeTransition wrapper.
 */

import { redirect } from "next/navigation";

export default function DirectorOpsLegacyRedirect() {
  redirect("/?mode=director");
}
