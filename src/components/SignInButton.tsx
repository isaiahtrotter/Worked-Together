"use client";

import { createClient } from "@/lib/supabase/client";

export default function SignInButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const supabase = createClient();

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <button onClick={signIn} className={className ?? "google-signin-btn"}>
      {children ?? "Continue with Google"}
    </button>
  );
}
