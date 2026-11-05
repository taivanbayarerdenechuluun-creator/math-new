import Link from "next/link";
import { Activity, ArrowRight, Bot, CheckCircle2, ClipboardCheck, FileStack, FileUp, GraduationCap, ListChecks, ScanText, Users } from "lucide-react";
import { requirePageRole, STAFF } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAiConfigured } from "@/services/ai/anthropic";
import { ocrStatus } from "@/services/ocr";
import { Alert, Badge, Card, CardBody, CardHeader, LinkButton, PageHeader, StatCard, STATUS_TONE } from "@/components/ui/primitives";
import { ActivityChart, HorizontalBars } from "@/components/analytics/charts";
import { MathText } from "@/components/mathematics/math-text";
import { QUESTION_STATUS_LABELS, type QuestionStatus } from "@/lib/constants";
import { addDays, dayKey, formatDateTime, pct } from "@/lib/utils";

export const metadata = { title: "Хянах самбар" };

const ACTION_LABELS: Record<string, string> = {
  CREATE: "үүсгэв", UPDATE: "засав", DELETE: "устгав", STATUS: "төлөв өөрчлөв", IMPORT: "импортлов", LOGIN: "нэвтэрлээ", REGISTER: "бүртгүүлэв", GRADE: "үнэлэв", SEED: "анхны өгөгдөл", ROLE_CHANGE: "эрх өөрчлөв", PASSWORD_CHANGE: "нууц үг солив",
};

export default async function AdminDashboard() {
  const user = await requirePageRole(STAFF);
  const today = dayKey();
  const from = addDays(today, -13);
  const [students, teachers, totalQ, statusGroups, exams, attempts, activity, topUsed, recentLogs, aiByEngine, importJobs, reviewQueue] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "TEACHER" } }),
    db.question.count(),
    db.question.groupBy({ by: ["status"], _count: true }),
    db.examination.count(),
    db.examinationAttempt.count({ where: { status: { not: "IN_PROGRESS" } } }),
    db.dailyActivity.groupBy({ by: ["date"], where: { date: { gte: from } }, _sum: { problemsSolved: true, correct: true, minutes: true }, _count: { userId: true } }),
    db.question.findMany({ where: { timesAnswered: { gt: 0 } }, orderBy: { timesAnswered: "desc" }, take: 5, select: { id: true, code: true, text: true, timesAnswered: true, timesCorrect: true } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    db.solvedProblem.groupBy({ by: ["engine"], _count: true }),
    db.questionImportJob.findMany({ select: { status: true, succeeded: true, failed: true } }),
    db.question.findMany({ where: { status: "NEEDS_REVIEW" }, take: 4, orderBy: { createdAt: "asc" }, select: { id: true, code: true, text: true, gradeId: true } }),
  ]);
  const byDate = new Map(activity.map((a) => [a.date, a]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(from, i);
    const a = byDate.get(d);
    return { date: d, problems: a?._sum.problemsSolved ?? 0, correct: a?._sum.correct ?? 0, minutes: a?._count.userId ?? 0 };
  });
  const sc = (s: string) => statusGroups.find((g) => g.status === s)?._count ?? 0;
  const activeToday = byDate.get(today)?._count.userId ?? 0;
  const ai = isAiConfigured();
  const ocr = ocrStatus();
  const imported = importJobs.reduce((s, j) => s + j.succeeded, 0);
  const importFailed = importJobs.reduce((s, j) => s + j.failed, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={user.role === "ADMIN" ? "Админ" : "Багш"}
        title={`Сайн байна уу, ${user.name.split(" ").slice(-1)[0]}`}
        description="Бодлогын сан, баталгаажуулалт, сурагчдын идэвхийн тойм."
        actions={
          <>
            <LinkButton href="/admin/import" variant="outline"><FileUp className="h-4 w-4" /> Импорт</LinkButton>
            <LinkButton href="/admin/questions/new">Шинэ бодлого</LinkButton>
          </>
        }
      />

      {(!ai || !(ocr.mathpix || ocr.vision)) && (
        <Alert tone="warning" title="Гадаад үйлчилгээний тохиргоо дутуу">
          {!ai && "AI (ANTHROPIC_API_KEY) тохируулаагүй — AI багш, текст бодлогын бодолт, AI бүтэцжүүлэлт идэвхгүй. "}
          {!(ocr.mathpix || ocr.vision) && "OCR тохируулаагүй — зураг/PDF таних идэвхгүй. "}
          Тооцооллын хөдөлгүүр, бодлогын сан, шалгалт бүрэн ажиллана. Тохиргооны заавар README.md-д бий.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Сурагчид" value={students} sub={`Өнөөдөр идэвхтэй ${activeToday}`} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Багш нар" value={teachers} icon={<GraduationCap className="h-4 w-4" />} tone="info" />
        <StatCard label="Бодлого" value={totalQ} sub={`${sc("PUBLISHED")} нийтлэгдсэн · ${sc("VERIFIED")} баталгаажсан`} icon={<FileStack className="h-4 w-4" />} tone="accent" />
        <StatCard label="Хянах хүлээгдэж буй" value={sc("NEEDS_REVIEW")} sub={`${sc("DRAFT")} ноорог`} icon={<ListChecks className="h-4 w-4" />} tone="warning" />
        <StatCard label="Шалгалт" value={exams} sub={`${attempts} удаа өгсөн`} icon={<ClipboardCheck className="h-4 w-4" />} tone="success" />
        <StatCard label="Бодогч ашиглалт" value={aiByEngine.reduce((s, g) => s + g._count, 0)} sub={aiByEngine.map((g) => `${g.engine === "SYMBOLIC" ? "Тооцоолол" : g.engine === "AI" ? "AI" : "AI+шалгалт"} ${g._count}`).join(" · ") || "—"} icon={<Bot className="h-4 w-4" />} tone="primary" />
        <StatCard label="OCR импорт" value={imported} sub={`${importFailed} алдаатай · ${importJobs.length} ажил`} icon={<ScanText className="h-4 w-4" />} tone="info" />
        <StatCard label="Баталгаажсан хувь" value={`${pct(sc("PUBLISHED") + sc("VERIFIED"), totalQ)}%`} sub="нийт бодлогоос" icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Сурагчдын идэвх" description="Сүүлийн 14 хоногт бодсон бодлого (нийт)" icon={<Activity className="h-4 w-4" />} />
          <CardBody><ActivityChart data={days} labelMode="date" /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Хянах дараалал" icon={<ListChecks className="h-4 w-4" />} action={<Link href="/admin/review" className="text-sm font-semibold text-primary hover:underline">Бүгд</Link>} />
          <CardBody className="pt-3">
            {reviewQueue.length === 0 ? <p className="text-sm text-muted">Хоосон байна 🎉</p> : (
              <ul className="space-y-2">
                {reviewQueue.map((q) => (
                  <li key={q.id}>
                    <Link href={`/admin/questions/${q.id}`} className="flex items-center gap-2 rounded-xl border border-border p-2.5 hover:border-primary/40">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] text-primary">{q.code} · {q.gradeId}-р</p>
                        <div className="truncate text-sm"><MathText text={q.text} inline /></div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Их ашиглагдсан бодлогууд" description="Зөв хариулсан хувиар" />
          <CardBody>
            {topUsed.length === 0 ? <p className="text-sm text-muted">Өгөгдөл алга.</p> : <HorizontalBars data={topUsed.map((q) => ({ label: q.code, value: pct(q.timesCorrect, q.timesAnswered), sub: `${q.timesAnswered} удаа` }))} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Сүүлийн үйлдлүүд" />
          <CardBody className="pt-3">
            <ul className="divide-y divide-border text-sm">
              {recentLogs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate"><b>{l.user?.name ?? "Систем"}</b> {l.entity} {ACTION_LABELS[l.action] ?? l.action}</span>
                  <span className="shrink-0 text-xs text-subtle">{formatDateTime(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Бодлогын сангийн төлөв" />
        <CardBody className="flex flex-wrap gap-2">
          {(["DRAFT", "NEEDS_REVIEW", "VERIFIED", "PUBLISHED", "REJECTED"] as QuestionStatus[]).map((s) => (
            <Link key={s} href={`/admin/questions?status=${s}`}>
              <Badge tone={STATUS_TONE[s]} className="px-3 py-1.5 text-sm">{QUESTION_STATUS_LABELS[s]}: {sc(s)}</Badge>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
