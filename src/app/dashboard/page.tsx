import {
  getOwnProfile,
  getOwnWorkSamples,
  getOwnConnectionsData,
} from "@/lib/dal";
import ProfileSection from "@/components/dashboard/ProfileSection";
import WorkSamplesSection from "@/components/dashboard/WorkSamplesSection";
import ConnectionsSection from "@/components/dashboard/ConnectionsSection";
import EmbedSection from "@/components/dashboard/EmbedSection";
import PreviewPanel from "@/components/dashboard/PreviewPanel";
import styles from "@/components/dashboard/widget-ui.module.css";

export default async function DashboardPage() {
  const profile = await getOwnProfile();
  if (!profile) return null;

  const [workSamples, connections] = await Promise.all([
    getOwnWorkSamples(),
    getOwnConnectionsData(),
  ]);

  return (
    <div className={styles.page}>
      <div className={styles.mainCol}>
        <ProfileSection profile={profile} />
        <WorkSamplesSection profileId={profile.id} workSamples={workSamples} />
        <ConnectionsSection
          incoming={connections.incoming}
          outgoing={connections.outgoing}
          accepted={connections.accepted}
        />
        <EmbedSection embedKey={profile.embed_key} />
      </div>

      <div className={styles.sideCol}>
        <PreviewPanel
          embedKey={profile.embed_key}
          initialSettings={profile.widget_settings}
        />
      </div>
    </div>
  );
}
