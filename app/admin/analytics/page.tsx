import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody, CardHeader, PageHeader, StatCard } from "@/components/ui/primitives";
import { ActivityChart, HorizontalBars } from "@/components/analytics/charts";
import { MathText } from "@/components/mathematics/math-text";
import { addDays, dayKey, pct } from "@/lib/utils";

export const metadata = { title: "Шинжилгээ" };

export default async function AnalyticsPage() {
  await requirePageRole(["ADMIN"]);
  const today = dayKey();
  const from = addDays(today, -29);
  const since = new Date(Date.now() - 30 * 86400000);
  const [regs, activeAgg, hardest, topicAnswers, exams, aiConvos, aiMsgs, solverByEngine, verification, jobs, teacherActions] = await Promise.all([
    db.user.findMany({ where: { role: "STUDENT", createdAt: { gte: since } }, select: { createdAt: true } }),
    db.dailyActivity.groupBy({ by: ["date"], where: { date: { gte: from } }, _count: { userId: true }, _sum: { problemsSolved: true, correct: true } }),
    db.question.findMany({ where: { timesAnswered: { gte: 3 } }, orderBy: { timesCorrect: "asc" }, take: 40, select: { id: true, code: true, text: true, timesAnswered: true, timesCorrect: true } }),
    db.practiceAnswer.findMany({ where: { createdAt: { gte: since } }, select: { isCorrect: true, question: { select: { topic: { select: { title: true } } } } } }),
    db.examination.findMany({ include: { attempts: { where: { status: { not: "IN_PROGRESS" } }, select: { percentage: true } } } }),
    db.aiConversation.count({ where: { createdAt: { gte: since } } }),
    db.aiMessage.count({ where: { createdAt: { gte: since }, role: "assistant" } }),
    db.solvedProblem.groupBy({ by: ["engine"], where: { createdAt: { gte: since } }, _count: true }),
    db.solvedProblem.groupBy({ by: ["verification"], where: { createdAt: { gte: since } }, _count: true }),
    db.questionImportJob.findMany({ where: { createdAt: { gte: since } }, select: { type: true, succeeded: true, failed: true } }),
    db.auditLog.groupBy({ by: ["userId"], where: { createdAt: { gte: since }, user: { role: "TEACHER" } }, _count: true }),
  ]);

  const byDate = new Map(activeAgg.map((a) => [a.date, a]));
  const regByDate = new Map<string, number>();
  regs.forEach((r) => regByDate.set(dayKey(r.createdAt), (regByDate.get(dayKey(r.createdAt)) ?? 0) + 1));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(from, i);
    return { date: d, problems: byDate.get(d)?._count.userId ?? 0, correct: byDate.get(d)?._sum.correct ?? 0, minutes: byDate.get(d)?._sum.problemsSolved ?? 0 };
  });
  const regDays = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(from, i);
    return { date: d, problems: regByDate.get(d) ?? 0, correct: 0 };
  });
  const hardestSorted = [...hardest].sort((a, b) => a.timesCorrect / a.timesAnswered - b.timesCorrect / b.timesAnswered).slice(0, 6);
  const topicMap = new Map<string, { t: number; c: number }>();
  topicAnswers.forEach((a) => {
    const k = a.question.topic?.title ?? "Сэдэвгүй";
    const m = topicMap.get(k) ?? { t: 0, c: 0 };
    m.t++;
    if (a.isCorrect) m.c++;
    topicMap.set(k, m);
  });
  const topicDifficulty = [...topicMap.entries()].filter(([, v]) => v.t >= 3).map(([k, v]) => ({ label: k, value: pct(v.c, v.t), sub: `${v.t} хариулт` })).sort((a, b) => a.value - b.value).slice(0, 8);
  const vCount = (k: string) => verification.find((v) => v.verification === k)?._count ?? 0;
  const totalSolver = solverByEngine.reduce((s, g) => s + g._count, 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Админ" title="Шинжилгээ" description="Сүүлийн 30 хоногийн нэгдсэн үзүүлэлт. Сурагчдын хувийн мэдээллийг нэгтгэсэн хэлбэрээр л харуулна." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Шинэ сурагч" value={regs.length} sub="30 хоногт" />
        <StatCard label="AI яриа" value={aiConvos} sub={`${aiMsgs} AI хариулт`} tone="info" />
        <StatCard label="Бодогч" value={totalSolver} sub={`Шалгагдсан ${pct(vCount("VERIFIED"), totalSolver)}% · Зөрүүтэй ${vCount("MISMATCH")}`} tone="accent" />
        <StatCard label="Импорт" value={jobs.reduce((s, j) => s + j.succeeded, 0)} sub={`${jobs.reduce((s, j) => s + j.failed, 0)} алдаа · ${jobs.length} ажил`} tone="warning" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Идэвхтэй сурагчид" description="Өдөр бүр идэвх гаргасан сурагчийн тоо" /><CardBody><ActivityChart data={days} labelMode="date" /></CardBody></Card>
        <Card><CardHeader title="Бүртгэл" description="Өдөр бүрийн шинэ сурагч" /><CardBody><ActivityChart data={regDays} labelMode="date" /></CardBody></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Сэдвийн хүндрэл" description="Хамгийн бага нарийвчлалтай сэдвүүд (дасгал)" />
          <CardBody>{topicDifficulty.length ? <HorizontalBars data={topicDifficulty} /> : <p className="text-sm text-muted">Өгөгдөл хангалтгүй.</p>}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Шалгалтын оролцоо ба дундаж" />
          <CardBody><HorizontalBars data={exams.filter((e) => e.attempts.length).map((e) => ({ label: e.title, value: Math.round(e.attempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / e.attempts.length), sub: `${e.attempts.length} оролдлого` }))} /></CardBody>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Хамгийн хүнд бодлогууд" description="3+ удаа хариулсан, зөв хувь хамгийн бага" />
          <CardBody className="space-y-2">
            {hardestSorted.length === 0 && <p className="text-sm text-muted">Өгөгдөл хангалтгүй.</p>}
            {hardestSorted.map((q) => (
              <div key={q.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5 text-sm">
                <span className="font-mono text-xs text-primary">{q.code}</span>
                <span className="min-w-0 flex-1 truncate"><MathText text={q.text} inline /></span>
                <span className="font-semibold">{pct(q.timesCorrect, q.timesAnswered)}%</span>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="AI ба бодогчийн ашиглалт" />
          <CardBody>
            <HorizontalBars
              valueSuffix=""
              max={Math.max(1, totalSolver)}
              data={solverByEngine.map((g) => ({ label: g.engine === "SYMBOLIC" ? "Тооцооллын хөдөлгүүр" : g.engine === "AI" ? "AI (шалгагдаагүй)" : "AI + тооцооллын шалгалт", value: g._count }))}
            />
            <p className="mt-4 text-xs text-muted">Багш нарын үйлдэл (30 хоног): {teacherActions.reduce((s, t) => s + t._count, 0)} — {teacherActions.length} идэвхтэй багш</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
