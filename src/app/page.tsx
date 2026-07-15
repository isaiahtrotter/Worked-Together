import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "linkenode",
  description: "Show your network on your portfolio with a single line of code.",
};

const FEATURES = [
  {
    background: "#a8e6e0",
    icon: "circle",
    title: "First degree connections only",
    description:
      "Your widget only ever shows people who've actually connected back with you — never a public list of everyone you've added.",
  },
  {
    background: "#f5e26b",
    icon: "diamond",
    title: "Easily see all your recommendations",
    description:
      "Every connection can leave a short note or endorsement, and it shows right on their card when someone clicks through.",
  },
  {
    background: "#f3b8cb",
    icon: "square",
    title: "Control exactly how it looks",
    description:
      "Pick your theme, radius, shadow, fonts, and colors — save once and it applies everywhere your widget is embedded.",
  },
  {
    background: "#c3b6f2",
    icon: "ring",
    title: "Embed with a single script tag",
    description:
      "Copy one script tag into your site's HTML and your live network shows up wherever you paste it.",
  },
] as const;

const ICON_CLASS: Record<(typeof FEATURES)[number]["icon"], string> = {
  circle: styles.featureIconCircle,
  diamond: styles.featureIconDiamond,
  square: styles.featureIconSquare,
  ring: styles.featureIconRing,
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.wordmark}>linkenode</p>
        <span className={styles.badge}>Public beta</span>
        <h1 className={styles.headline}>Increase your design credibility.</h1>
        <p className={styles.subtext}>
          Show your network on your portfolio with a single line of code.
        </p>
        <SignInButton className={styles.ctaButton}>Get started →</SignInButton>
      </div>

      <div className={styles.features}>
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className={styles.featureCard}
            style={{ backgroundColor: feature.background }}
          >
            <span className={`${styles.featureIcon} ${ICON_CLASS[feature.icon]}`} />
            <p className={styles.featureTitle}>{feature.title}</p>
            <p className={styles.featureDesc}>{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
