import { Award, BookOpen, CalendarDays, CheckCircle2, Clock, Flame, Lock, Medal, Target, TrendingUp, Trophy } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStudentOverview } from "@/features/progress/server";
import { ACHIEVEMENTS } from "@/features/gamification/server";
import { Avatar, Badge, Card, CardBody, CardHeader, PageHeader, StatCard } from "@/components/ui/primitives";
import { ActivityChart, HorizontalBars, RingProgress, ScoreTrend } from "@/components/analytics/charts";
import { cn, formatDate, levelFromXp } from "@/lib/utils";

export const metadata = { title: "Миний ахиц" };

export default async function ProgressPage() {
  const user = await requirePageRole(["STUDENT"]);
  const [o, leaders] = await Promise.all([
    getStudentOverview(user.id),
    db.user.findMany({ where: { role: "STUDENT", showOnLeaderboard: true, isActive: true }, orderBy: { xp: "desc" }, take: 10, select: { id: true, name: true, xp: true, grade: true, avatarColor: true } }),
  ]);
  const minutes30 = o.days.reduce((s, d) => s + d.minutes, 0);
  const activeDays = o.days.filter((d) => d.problems > 0 || d.lessons > 0).length;
  const owned = new Set(o.achievements.map((a) => a.achievement.code));
  const trend = [...o.attempts].reverse().map((a, i) => ({ label: `${i + 1}. ${formatDate(a.submittedAt ?? a.startedAt).slice(5)}`, value: a.percentage ?? 0 }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Аналитик" title="Миний ахиц" description="Сүүлийн 30 хоногийн идэвх, сэдвийн эзэмшил, шалгалтын түүх." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Түвшин" value={o.user.levelInfo.level} sub={`${o.user.xp} XP нийт`} icon={<Trophy className="h-4 w-4" />} />
        <StatCard label="Цуваа" value={`${o.user.streak} өдөр`} sub={`Хамгийн урт: ${o.user.longestStreak}`} icon={<Flame className="h-4 w-4" />} tone="warning" />
        <StatCard label="Идэвхтэй өдөр" value={`${activeDays}/30`} sub={`${minutes30} минут суралцсан`} icon={<CalendarDays className="h-4 w-4" />} tone="info" />
        <StatCard label="Нарийвчлал" value={`${o.totals.accuracy}%`} sub={`${o.totals.practiceTotal} дасгал`} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
      </div>

      <Card>
        <CardHeader title="30 хоногийн идэвх" description="Өдөр бүр бодсон бодлого" icon={<TrendingUp className="h-4 w-4" />} />
        <CardBody>
          <ActivityChart data={o.days} labelMode="date" height={240} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Сэдвийн эзэмшил" description="Дасгал ба шалгалтын хариултаар" icon={<Target className="h-4 w-4" />} />
          <CardBody>
            {o.stats.length === 0 ? <p className="text-sm text-muted">Одоогоор өгөгдөл алга.</p> : <HorizontalBars data={o.stats.map((s) => ({ label: `${s.title} (${s.grade}-р)`, value: s.accuracy, sub: `${s.correct}/${s.attempts}` }))} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Шалгалтын бэлэн байдал" icon={<Award className="h-4 w-4" />} />
          <CardBody className="flex flex-col items-center text-center">
            <RingProgress value={o.readiness} size={150} stroke={12} label="тооцоолол" />
            <p className="mt-4 text-sm text-muted">Дасгалын нарийвчлал (30%), сүүлийн шалгалтуудын дундаж (50%), хичээлийн хамрагдалт (20%)-аар тооцоолсон. Энэ нь баталгаат үр дүн биш, чиглүүлэх үзүүлэлт юм.</p>
            <div className="mt-4 grid w-full grid-cols-2 gap-2 text-left text-sm">
              <div className="rounded-xl bg-surface-2/60 p-3">
                <p className="text-xs text-subtle">Хамрагдалт</p>
                <p className="font-semibold">{o.totals.coverage}%</p>
              </div>
              <div className="rounded-xl bg-surface-2/60 p-3">
                <p className="text-xs text-subtle">Шалгалтын дундаж</p>
                <p className="font-semibold">{o.examAvg !== null ? `${Math.round(o.examAvg)}%` : "—"}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Шалгалтын түүх" icon={<BookOpen className="h-4 w-4" />} />
          <CardBody>{trend.length === 0 ? <p className="text-sm text-muted">Шалгалт өгөөгүй байна.</p> : <ScoreTrend data={trend} />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Тэргүүлэгчид" description="Нэрээ харуулахыг зөвшөөрсөн сурагчид" icon={<Medal className="h-4 w-4" />} />
          <CardBody className="pt-3">
            {!user.showOnLeaderboard && <p className="mb-3 rounded-lg bg-surface-2/60 px-3 py-2 text-xs text-muted">Та жагсаалтад харагдахгүй байна. Профайл хэсгээс идэвхжүүлж болно.</p>}
            <ol className="space-y-1">
              {leaders.map((l, i) => (
                <li key={l.id} className={cn("flex items-center gap-3 rounded-xl px-2 py-2", l.id === user.id && "bg-primary-soft")}>
                  <span className={cn("w-6 text-center text-sm font-bold", i < 3 ? "text-warning" : "text-subtle")}>{i + 1}</span>
                  <Avatar name={l.name} color={l.avatarColor} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{l.name}</span>
                  <span className="text-xs text-subtle">Түв. {levelFromXp(l.xp).level}</span>
                  <span className="w-16 text-right text-sm font-semibold tabular-nums">{l.xp} XP</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Амжилтууд" description={`${owned.size}/${ACHIEVEMENTS.length} нээгдсэн`} icon={<Trophy className="h-4 w-4" />} />
        <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const has = owned.has(a.code);
            const earned = o.achievements.find((x) => x.achievement.code === a.code);
            return (
              <div key={a.code} className={cn("rounded-2xl border p-4", has ? "border-primary/30 bg-primary-soft/40" : "border-border opacity-60")}>
                <div className={cn("grid h-10 w-10 place-items-center rounded-xl", has ? "bg-gradient-to-br from-[#7c62ff] to-[#14c3e0] text-white" : "bg-surface-2 text-subtle")}>
                  {has ? <Trophy className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <p className="mt-3 text-sm font-semibold">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted">{a.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge tone={has ? "primary" : "neutral"}>+{a.xpReward} XP</Badge>
                  {earned && (
                    <span className="flex items-center gap-1 text-[11px] text-subtle">
                      <Clock className="h-3 w-3" /> {formatDate(earned.earnedAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
