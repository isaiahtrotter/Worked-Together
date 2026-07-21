"use client";

import posthog from "posthog-js";

declare global {
  interface Window {
    __posthogInitialized?: boolean;
  }
}

// Module-level (not inside a useEffect/component) so init runs the moment
// this module is first evaluated -- before any component's own effects can
// fire and call capture()/identify() on it. React runs mount effects
// child-before-parent, so an effect-based init in a top-level provider
// isn't guaranteed to run before a deeper child's own mount effect in the
// same commit; this ordering is. Guarded against Fast Refresh re-evaluating
// this module (and re-running init) on every hot reload in dev.
if (typeof window !== "undefined" && !window.__posthogInitialized) {
  window.__posthogInitialized = true;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
  });
}

export default posthog;
