import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePageRole, STAFF } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStudentOverview } from "@/features/progress/server";
import { Avatar, Badge, Card, CardBody, CardHeader, StatCard } from "@/components/ui/primitives";
import { ActivityChart, HorizontalBars, ScoreTrend } from "@/components/analytics/charts";
import { formatDate } from "@/lib/utils";

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(STAFF);
  const { id } = await params;
  const s = await db.user.findUnique({ where: { id }, select: { id: true, role: true, name: true, avatarColor: true } });
  if (!s || s.role !== "STUDENT") notFound();
  const o = await getStudentOverview(id);
  return (
    <div className="space-y-6">
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Сурагчид</Link>
      <div className="flex items-center gap-4">
        <Avatar name={s.name} color={s.avatarColor} size={56} />
        <div>
          <h1 className="font-display text-2xl font-semibold">{s.name}</h1>
          <p className="text-sm text-muted">{o.user.grade}-р анги · Түвшин {o.user.levelInfo.level} · 🔥 {o.user.streak} өдөр</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Дасгал" value={o.totals.practiceTotal} />
        <StatCard label="Нарийвчлал" value={`${o.totals.accuracy}%`} tone="success" />
        <StatCard label="Хичээл" value={`${o.totals.lessonsDone}/${o.totals.gradeLessons}`} tone="info" />
        <StatCard label="Бэлэн байдал (тооцоолол)" value={o.readiness !== null ? `${o.readiness}%` : "—"} tone="accent" />
      </div>
      <Card>
        <CardHeader title="30 хоногийн идэвх" />
        <CardBody><ActivityChart data={o.days} labelMode="date" /></CardBody>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Сэдвийн эзэмшил" />
          <CardBody>{o.stats.length ? <HorizontalBars data={o.stats.map((t) => ({ label: t.title, value: t.accuracy, sub: `${t.correct}/${t.attempts}` }))} /> : <p className="text-sm text-muted">Өгөгдөл алга.</p>}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Шалгалтын түүх" />
          <CardBody>
            {o.attempts.length ? (
              <>
                <ScoreTrend data={[...o.attempts].reverse().map((a, i) => ({ label: `${i + 1}`, value: a.percentage ?? 0 }))} />
                <ul className="mt-3 divide-y divide-border text-sm">
                  {o.attempts.map((a) => (
                    <li key={a.id} className="flex justify-between py-2">
                      <span>{a.exam.title} <span className="text-xs text-subtle">{formatDate(a.startedAt)}</span></span>
                      <Badge tone={(a.percentage ?? 0) >= a.exam.passingScore ? "success" : "danger"}>{a.percentage}%</Badge>
                    </li>
                  ))}
                </ul>
              </>
            ) : <p className="text-sm text-muted">Шалгалт өгөөгүй.</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
