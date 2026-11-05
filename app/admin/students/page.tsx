import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requirePageRole, STAFF } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, Badge, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui/primitives";
import { GRADES } from "@/lib/constants";
import { addDays, dayKey, formatDate, levelFromXp, pct } from "@/lib/utils";

export const metadata = { title: "Сурагчдын гүйцэтгэл" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ grade?: string; q?: string }> }) {
  const user = await requirePageRole(STAFF);
  const sp = await searchParams;
  const assigned = user.role === "TEACHER" ? (await db.teacherTopicAssignment.findMany({ where: { userId: user.id } })).map((a) => a.gradeId) : [];
  const grade = Number(sp.grade) || undefined;
  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      ...(grade ? { grade } : assigned.length ? { grade: { in: assigned } } : {}),
      ...(sp.q ? { name: { contains: sp.q } } : {}),
    },
    orderBy: { xp: "desc" },
    take: 200,
    // Нууцлал: багшид имэйл харуулахгүй, зөвхөн сургалтын үзүүлэлт
    select: { id: true, name: true, grade: true, xp: true, streak: true, lastActiveDate: true, avatarColor: true, createdAt: true },
  });
  const ids = students.map((s) => s.id);
  const [practice, exams] = await Promise.all([
    db.practiceAnswer.groupBy({ by: ["userId", "isCorrect"], where: { userId: { in: ids } }, _count: true }),
    db.examinationAttempt.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: { not: "IN_PROGRESS" } }, _avg: { percentage: true }, _count: true }),
  ]);
  const weekAgo = addDays(dayKey(), -7);

  return (
    <div>
      <PageHeader title="Сурагчдын гүйцэтгэл" description="Сурагч бүрийн дасгалын нарийвчлал, шалгалтын дундаж, идэвх. Хувийн мэдээллийг хамгаалах үүднээс зөвхөн сургалтын үзүүлэлт харагдана." />
      <Card className="mb-4 p-4">
        <form className="flex flex-wrap gap-2" action="/admin/students">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input name="q" defaultValue={sp.q} placeholder="Нэрээр хайх" className="pl-9" />
          </div>
          <Select name="grade" defaultValue={sp.grade ?? ""} className="w-40">
            <option value="">Бүх анги</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}-р анги</option>)}
          </Select>
          <button className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white">Шүүх</button>
        </form>
      </Card>
      {students.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="Сурагч олдсонгүй" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border bg-surface-2/50 text-left text-xs uppercase tracking-wide text-subtle">
                <tr>
                  <th className="px-4 py-3">Сурагч</th>
                  <th className="px-4 py-3">Анги</th>
                  <th className="px-4 py-3">Түвшин</th>
                  <th className="px-4 py-3">Дасгал</th>
                  <th className="px-4 py-3">Нарийвчлал</th>
                  <th className="px-4 py-3">Шалгалт</th>
                  <th className="px-4 py-3">Идэвх</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => {
                  const c = practice.find((p) => p.userId === s.id && p.isCorrect)?._count ?? 0;
                  const w = practice.find((p) => p.userId === s.id && !p.isCorrect)?._count ?? 0;
                  const e = exams.find((x) => x.userId === s.id);
                  const acc = pct(c, c + w);
                  const active = s.lastActiveDate && s.lastActiveDate >= weekAgo;
                  return (
                    <tr key={s.id} className="hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <Link href={`/admin/students/${s.id}`} className="flex items-center gap-3 font-semibold hover:text-primary">
                          <Avatar name={s.name} color={s.avatarColor} size={30} /> {s.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{s.grade ?? "—"}</td>
                      <td className="px-4 py-3">{levelFromXp(s.xp).level} <span className="text-xs text-subtle">({s.xp} XP)</span></td>
                      <td className="px-4 py-3">{c + w}</td>
                      <td className="px-4 py-3">{c + w ? <Badge tone={acc >= 75 ? "success" : acc >= 50 ? "warning" : "danger"}>{acc}%</Badge> : "—"}</td>
                      <td className="px-4 py-3">{e ? `${e._count} · дундаж ${Math.round(e._avg.percentage ?? 0)}%` : "—"}</td>
                      <td className="px-4 py-3">{active ? <Badge tone="success">🔥 {s.streak}</Badge> : <span className="text-xs text-subtle">{s.lastActiveDate ? formatDate(s.lastActiveDate) : "—"}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
