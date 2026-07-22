"use client";

// Renders nothing -- importing this module is the only thing that matters,
// since it triggers posthog.init() as a side effect (see src/lib/posthog.ts).
// Rendered once from the root layout so every route (marketing + dashboard)
// gets PostHog active, including pages that don't otherwise import anything
// PostHog-related themselves.
import { useEffect } from "react";
import posthog from "@/lib/posthog";

export default function PostHogInit() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    // register_once (not register) -- this is first-touch attribution:
    // whichever link originally brought this visitor in is what should
    // stick, not whatever they clicked most recently. Persists as a "super
    // property" (posthog-js attaches these to every event captured from
    // here on, stored alongside the distinct_id), so signup_completed,
    // connection_added, etc. all carry it even though those fire well after
    // this query param is gone from the URL. "host" is the recruiting
    // embed's embed_key when ref=badge (see the "Made with Linkenode" link
    // in public/network-widget/widget.js) -- absent for other sources, e.g.
    // ?ref=tw on a tweeted link.
    posthog.register_once({ source: ref, host: params.get("host") ?? undefined });
  }, []);

  return null;
}
