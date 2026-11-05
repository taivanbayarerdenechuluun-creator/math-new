import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/primitives";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const metadata = { title: "Профайл" };

export default async function ProfilePage() {
  const user = await requirePageRole(["STUDENT"]);
  return (
    <div>
      <PageHeader title="Профайл" description="Хувийн мэдээлэл, суралцах тохиргоо, нууцлал." />
      <ProfileForm user={{ name: user.name, email: user.email, role: user.role, grade: user.grade, dailyGoal: user.dailyGoal, explainMode: user.explainMode, avatarColor: user.avatarColor, showOnLeaderboard: user.showOnLeaderboard }} />
    </div>
  );
}
