import { requirePageRole, STAFF } from "@/lib/auth";
import { PageHeader } from "@/components/ui/primitives";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const metadata = { title: "Профайл" };

export default async function AdminProfile() {
  const user = await requirePageRole(STAFF);
  return (
    <div>
      <PageHeader title="Профайл" />
      <ProfileForm user={{ name: user.name, email: user.email, role: user.role, grade: user.grade, dailyGoal: user.dailyGoal, explainMode: user.explainMode, avatarColor: user.avatarColor, showOnLeaderboard: user.showOnLeaderboard }} />
    </div>
  );
}
