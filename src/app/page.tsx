import styles from "./page.module.css";
import NetworkWidget from "@/components/NetworkWidget";

export default function Home() {
  return (
    <div className={styles.page}>
      <h1>Isaiah Trotter</h1>
      <p>Portfolio dashboard — placeholder content, network widget lives in the corner.</p>
      <NetworkWidget />
    </div>
  );
}
