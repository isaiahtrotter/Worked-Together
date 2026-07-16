"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

type GoogleCredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            nonce: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Signs in via Google's client-side Identity Services rather than Supabase's
// hosted OAuth redirect -- that redirect round-trips through
// <project-ref>.supabase.co, which is why Google's consent screen used to
// show that raw domain instead of the app's name. This flow gets an ID
// token directly in the browser and hands it to Supabase, so Google only
// ever sees this site's own domain.
export default function SignInButton() {
  const supabase = createClient();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scriptLoaded || !window.google || !buttonRef.current) return;

    let cancelled = false;
    // The raw nonce is sent to Supabase to confirm this specific ID token
    // was minted for this sign-in attempt; Google's API only accepts the
    // hashed form.
    const rawNonce = crypto.randomUUID();

    sha256Hex(rawNonce).then((hashedNonce) => {
      if (cancelled || !window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashedNonce,
        callback: async (response) => {
          const { error: signInError } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
            nonce: rawNonce,
          });
          if (signInError) {
            setError(signInError.message);
            return;
          }
          window.location.href = "/dashboard";
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [scriptLoaded, supabase]);

  return (
    <div>
      <Script src="https://accounts.google.com/gsi/client" onLoad={() => setScriptLoaded(true)} />
      <div ref={buttonRef} />
      {error && (
        <p style={{ color: "#a33", fontSize: 13, marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
}
