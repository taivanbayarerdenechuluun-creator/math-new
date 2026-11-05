import Link from "next/link";
import { ArrowRight, BookOpen, Bot, Camera, CheckCircle2, ClipboardCheck, Flame, Sigma, Sparkles, Target, Trophy, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRecommendations, getStudentOverview } from "@/features/progress/server";
import { Badge, Card, CardBody, CardHeader, EmptyState, LinkButton, Progress, StatCard } from "@/components/ui/primitives";
import { ActivityChart, HorizontalBars, RingProgress } from "@/components/analytics/charts";
import { MathText } from "@/components/mathematics/math-text";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Нүүр хуудас" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Ulaanbaatar" }).format(new Date()));
  if (h < 11) return "Өглөөний мэнд";
  if (h < 18) return "Өдрийн мэнд";
  return "Оройн мэнд";
}

export default async function StudentDashboard() {
  const user = await requirePageRole(["STUDENT"]);
  const [o, recs, exams] = await Promise.all([
    getStudentOverview(user.id),
    getRecommendations(user.id, user.grade),
    db.examination.findMany({
      where: { isPublished: true, gradeId: user.grade ?? undefined, OR: [{ availableTo: null }, { availableTo: { gte: new Date() } }] },
      include: { _count: { select: { questions: true } } },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const { totals, levelInfo } = { totals: o.totals, levelInfo: o.user.levelInfo };
  const goalPct = Math.min(100, Math.round((totals.todayProblems / Math.max(1, o.user.dailyGoal)) * 100));
  const weekProblems = o.week.reduce((s, d) => s + d.problems, 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white sm:p-8">
        <div className="absolute inset-0 opacity-[0.1] bg-grid" style={{ ["--border" as string]: "#9ea3ff" }} />
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#5b3df5] opacity-50 blur-[90px]" />
        <div className="absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-[#0fb5d4] opacity-30 blur-[90px]" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm text-white/60">{greeting()},</p>
            <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{user.name} 👋</h1>
            <p className="mt-2 max-w-lg text-sm text-white/70">
              {totals.todayProblems >= o.user.dailyGoal
                ? "Өнөөдрийн зорилгоо биелүүллээ! Гайхалтай. Нэмэлт дасгал хийвэл бүр ч сайн."
                : `Өнөөдрийн зорилгод хүрэхэд ${o.user.dailyGoal - totals.todayProblems} бодлого үлдлээ.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton href="/student/solve" className="bg-white text-navy hover:bg-white/90">
                <Sigma className="h-4 w-4" /> Бодлого бодох
              </LinkButton>
              <LinkButton href="/student/solve?mode=camera" variant="ghost" className="border border-white/20 text-white hover:bg-white/10 hover:text-white">
                <Camera className="h-4 w-4" /> Зургаар бодуулах
              </LinkButton>
            </div>
          </div>
          <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500">
                <Flame className="h-6 w-6" />
              </div>
              <p className="mt-1.5 font-display text-xl font-semibold">{o.user.streak}</p>
              <p className="text-[11px] text-white/60">өдрийн цуваа</p>
            </div>
            <div className="h-16 w-px bg-white/10" />
            <div className="min-w-36">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold">Түвшин {levelInfo.level}</p>
                <p className="text-xs text-white/60">{o.user.xp} XP</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-gradient-to-r from-[#8d77ff] to-[#5ce1f4]" style={{ width: `${levelInfo.progress}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-white/60">
                Дараагийн түвшин хүртэл {levelInfo.needed - levelInfo.current} XP
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Бодсон бодлого" value={totals.practiceTotal + totals.problems} sub={`Энэ 7 хоногт ${weekProblems}`} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Нарийвчлал" value={`${totals.accuracy}%`} sub={`${totals.practiceCorrect} зөв / ${totals.practiceTotal}`} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <StatCard label="Дуусгасан хичээл" value={`${totals.lessonsDone}/${totals.gradeLessons}`} sub={`${totals.coverage}% хамрагдсан`} icon={<BookOpen className="h-4 w-4" />} tone="info" />
        <StatCard label="Шалгалт" value={totals.examsTaken} sub={o.examAvg !== null ? `Дундаж ${Math.round(o.examAvg)}%` : "Одоогоор өгөөгүй"} icon={<ClipboardCheck className="h-4 w-4" />} tone="accent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily goal + readiness */}
        <Card className="lg:col-span-1">
          <CardHeader title="Өдрийн зорилго" description={`${o.user.dailyGoal} бодлого бодох`} icon={<Zap className="h-4 w-4" />} />
          <CardBody>
            <div className="flex items-end justify-between">
              <p className="font-display text-3xl font-semibold">
                {totals.todayProblems}
                <span className="text-lg text-subtle">/{o.user.dailyGoal}</span>
              </p>
              {goalPct >= 100 && <Badge tone="success">Биелсэн</Badge>}
            </div>
            <Progress value={goalPct} className="mt-3" tone={goalPct >= 100 ? "success" : "primary"} />
            <div className="mt-6 flex items-center gap-5 border-t border-border pt-5">
              <RingProgress value={o.readiness} size={104} stroke={9} label="бэлэн байдал" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Шалгалтын бэлэн байдал</p>
                <p className="mt-1 text-xs text-muted">
                  {o.readiness === null
                    ? "Тооцоолоход хангалттай өгөгдөл алга. Дор хаяж 10 бодлого бодоорой."
                    : "Дасгалын нарийвчлал, шалгалтын дүн, хичээлийн хамрагдалт дээр суурилсан тооцоолол — баталгаат үр дүн биш."}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Weekly activity */}
        <Card className="lg:col-span-2">
          <CardHeader title="7 хоногийн идэвх" description="Өдөр бүр бодсон бодлогын тоо" icon={<TrendingUp className="h-4 w-4" />} />
          <CardBody>
            <ActivityChart data={o.week} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recommendations */}
        <Card className="lg:col-span-2">
          <CardHeader title="Танд зориулсан зөвлөмж" description="Сул сэдэв, урьдчилсан нөхцөлд үндэслэсэн" icon={<Sparkles className="h-4 w-4" />} />
          <CardBody className="pt-4">
            {recs.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title="Эхний алхмаа хийцгээе"
                description="Хэдэн дасгал ажилласны дараа таны сул талд тохирсон зөвлөмж энд гарна."
                action={<LinkButton href="/student/learn">Хичээл үзэх</LinkButton>}
              />
            ) : (
              <ul className="space-y-2">
                {recs.map((r, i) => (
                  <li key={i}>
                    <Link href={r.href} className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary-soft/40">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary">
                        {r.kind === "PREREQ" ? <TrendingDown className="h-4 w-4" /> : r.kind === "NEXT" ? <ArrowRight className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.title}</p>
                        <p className="truncate text-xs text-muted">{r.reason}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Strong / weak */}
        <Card>
          <CardHeader title="Сэдвийн эзэмшил" description="3+ оролдлоготой сэдвүүд" icon={<Trophy className="h-4 w-4" />} />
          <CardBody className="space-y-5 pt-4">
            {o.strongest.length === 0 ? (
              <p className="text-sm text-muted">Дасгал ажилласны дараа энд таны хүчтэй, сул сэдвүүд гарна.</p>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-success">Хүчтэй</p>
                  <HorizontalBars data={o.strongest.map((s) => ({ label: s.title, value: s.accuracy, sub: `${s.correct}/${s.attempts}` }))} />
                </div>
                {o.weakest.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warning">Анхаарах</p>
                    <HorizontalBars data={o.weakest.map((s) => ({ label: s.title, value: s.accuracy, sub: `${s.correct}/${s.attempts}` }))} />
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming exams */}
        <Card>
          <CardHeader title="Шалгалтын бэлтгэл" icon={<ClipboardCheck className="h-4 w-4" />} action={<Link href="/student/exams" className="text-sm font-semibold text-primary hover:underline">Бүгд</Link>} />
          <CardBody className="pt-4">
            {exams.length === 0 ? (
              <p className="text-sm text-muted">Таны ангид одоогоор нээлттэй шалгалт алга.</p>
            ) : (
              <ul className="space-y-2">
                {exams.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl bg-surface-2/60 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{e.title}</p>
                      <p className="text-xs text-muted">
                        {e._count.questions} асуулт · {e.durationMinutes} минут
                      </p>
                    </div>
                    <LinkButton href={`/student/exams/${e.id}`} size="sm" variant="outline">
                      Эхлэх
                    </LinkButton>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader title="Сүүлийн үйлдлүүд" icon={<Bot className="h-4 w-4" />} />
          <CardBody className="pt-4">
            {o.recentPractice.length === 0 && o.recentProblems.length === 0 ? (
              <p className="text-sm text-muted">Одоогоор үйлдэл алга.</p>
            ) : (
              <ul className="divide-y divide-border">
                {o.recentProblems.slice(0, 2).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <Badge tone="primary">Бодогч</Badge>
                    <Link href={`/student/solve/history/${p.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-primary">
                      <MathText text={!p.recognizedLatex ? (p.originalText ?? "") : p.recognizedLatex.includes("$") || /[а-яөүё]/i.test(p.recognizedLatex) ? p.recognizedLatex : `$${p.recognizedLatex}$`} inline />
                    </Link>
                    <span className="shrink-0 text-xs text-subtle">{formatDate(p.createdAt)}</span>
                  </li>
                ))}
                {o.recentPractice.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <Badge tone={p.isCorrect ? "success" : "danger"}>{p.isCorrect ? "Зөв" : "Буруу"}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm">{p.question.topic?.title ?? p.question.code}</span>
                    <span className="shrink-0 text-xs text-subtle">{formatDate(p.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
