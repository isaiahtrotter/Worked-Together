"use client";

// Renders nothing -- importing this module is the only thing that matters,
// since it triggers posthog.init() as a side effect (see src/lib/posthog.ts).
// Rendered once from the root layout so every route (marketing + dashboard)
// gets PostHog active, including pages that don't otherwise import anything
// PostHog-related themselves.
import "@/lib/posthog";

export default function PostHogInit() {
  return null;
}
