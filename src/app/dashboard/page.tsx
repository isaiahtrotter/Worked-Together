import {
  getOwnProfile,
  getOwnWorkSamples,
  getOwnConnectionsData,
  getNetworkDirectory,
  getSessionUser,
} from "@/lib/dal";
import DashboardPage from "@/components/dashboard/DashboardPage";

export default async function Page() {
  const profile = await getOwnProfile();
  if (!profile) return null;

  const [workSamples, connections, directory, user] = await Promise.all([
    getOwnWorkSamples(),
    getOwnConnectionsData(),
    getNetworkDirectory(),
    getSessionUser(),
  ]);

  // "Brand new signup" vs. a returning login -- last_sign_in_at is updated
  // on every sign-in including the very first one, so the two timestamps
  // only land within a few seconds of each other the first time. Compared
  // with a threshold rather than strict equality since they're set by
  // separate statements in the sign-in flow, not guaranteed byte-identical.
  const isNewSignup = !!(
    user?.created_at &&
    user?.last_sign_in_at &&
    Math.abs(new Date(user.created_at).getTime() - new Date(user.last_sign_in_at).getTime()) < 5000
  );

  return (
    <DashboardPage
      profile={profile}
      workSamples={workSamples}
      connections={connections}
      directory={directory}
      email={user?.email ?? null}
      isNewSignup={isNewSignup}
    />
  );
}
