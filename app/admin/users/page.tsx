import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/primitives";
import { UsersClient } from "./users-client";

export const metadata = { title: "Хэрэглэгчид" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const admin = await requirePageRole(["ADMIN"]);
  const sp = await searchParams;
  const users = await db.user.findMany({
    where: { ...(sp.role ? { role: sp.role } : {}), ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q.toLowerCase() } }] } : {}) },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    take: 300,
    select: { id: true, name: true, email: true, role: true, grade: true, isActive: true, createdAt: true, avatarColor: true, topicAssignments: { select: { gradeId: true } } },
  });
  return (
    <div>
      <PageHeader title="Хэрэглэгчид" description="Багш, админ үүсгэх, эрх өөрчлөх, багшид анги хуваарилах, бүртгэл түр хаах." />
      <UsersClient users={JSON.parse(JSON.stringify(users))} selfId={admin.id} filters={sp} />
    </div>
  );
}
