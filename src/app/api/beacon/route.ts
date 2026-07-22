import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Domains that are never a genuine external embed: the marketing page, the
// dashboard's own live preview, and local dev all load the same widget
// engine as a real embed does -- if these counted, "published"/activation
// numbers would be fiction rather than real installs in the wild.
const OWN_HOSTNAMES = new Set(["localhost", "127.0.0.1", "app.linkenode.com", "linkenode.com", "www.linkenode.com"]);

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

type BeaconBody = {
  event?: "load" | "open";
  profileId?: string;
  embedKey?: string;
  pageUrl?: string;
  referrer?: string | null;
  timestamp?: string;
};

// Receives beacons from the widget engine itself (public/network-widget/
// widget.js), fired via navigator.sendBeacon so a real visitor's page never
// has to wait on us or run any Linkenode/PostHog JS of its own -- visitors
// to a third-party site stay completely anonymous; only the widget OWNER's
// profileId (already a public value baked into the embed) is attached, so
// these events land on that person's own PostHog timeline alongside their
// dashboard activity (signup_completed, connection_added, etc.), not as a
// new anonymous person per visitor.
export async function POST(request: Request) {
  let body: BeaconBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { event, profileId, embedKey, pageUrl, referrer, timestamp } = body;
  if (!event || !profileId || !pageUrl) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let hostname: string;
  try {
    hostname = new URL(pageUrl).hostname;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (OWN_HOSTNAMES.has(hostname)) {
    return NextResponse.json({ ok: true, skipped: "own-domain" });
  }

  const eventName = event === "open" ? "embed_opened" : "embed_loaded";

  const tasks: PromiseLike<unknown>[] = [];

  if (POSTHOG_KEY) {
    tasks.push(
      fetch(`${POSTHOG_HOST}/i/v0/e/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: POSTHOG_KEY,
          event: eventName,
          distinct_id: profileId,
          properties: {
            embed_key: embedKey,
            page_url: pageUrl,
            page_host: hostname,
            referrer: referrer || null,
          },
          timestamp: timestamp || new Date().toISOString(),
        }),
      }),
    );
  }

  // "First external load" is the activation timestamp -- proof the embed
  // code actually got installed and works on a real site, not just copied.
  // Set once (is("first_external_load_at", null)) and never touched again.
  // Requires the service-role client (an anonymous visitor's request has no
  // session to write through RLS with) -- degrades to PostHog-only tracking
  // if SUPABASE_SERVICE_ROLE_KEY isn't configured yet.
  if (event === "load") {
    const admin = createAdminClient();
    if (admin) {
      tasks.push(
        admin
          .from("profiles")
          .update({ first_external_load_at: timestamp || new Date().toISOString() })
          .eq("id", profileId)
          .is("first_external_load_at", null)
          .then(() => undefined),
      );
    }
  }

  await Promise.allSettled(tasks);

  return NextResponse.json({ ok: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

// navigator.sendBeacon never triggers a CORS preflight regardless of body
// type, but the fetch() fallback (for browsers without sendBeacon) sends a
// real cross-origin request with a JSON content-type, which does. This
// endpoint returns nothing sensitive and needs no cookies/credentials, so a
// permissive origin is fine -- it just lets that fallback path complete
// cleanly from any third-party site instead of erroring in devtools.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
