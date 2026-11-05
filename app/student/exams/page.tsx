import Link from "next/link";
import { ClipboardCheck, Clock, FileQuestion, History, Target } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { examIsOpen } from "@/features/examinations/server";
import { Badge, Card, CardBody, CardHeader, EmptyState, LinkButton, PageHeader } from "@/components/ui/primitives";
import { GRADES } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Шалгалт" };

export default async function ExamsPage({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const user = await requirePageRole(["STUDENT"]);
  const sp = await searchParams;
  const grade = sp.grade === "all" ? null : Number(sp.grade) || user.grade;

  const [exams, attempts] = await Promise.all([
    db.examination.findMany({
      where: { isPublished: true, ...(grade ? { gradeId: grade } : {}) },
      include: { _count: { select: { questions: true } }, attempts: { where: { userId: user.id }, orderBy: { startedAt: "desc" } } },
      orderBy: [{ gradeId: "asc" }, { createdAt: "desc" }],
    }),
    db.examinationAttempt.findMany({ where: { userId: user.id }, include: { exam: true }, orderBy: { startedAt: "desc" }, take: 20 }),
  ]);

  return (
    <div>
      <PageHeader eyebrow="Шалгалтын симулятор" title="Шалгалт" description="Бодит шалгалтын орчинд хугацаатай дадлага хийж, сул талаа илрүүлээрэй." />
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        <Link href="/student/exams?grade=all" className={cn("h-9 shrink-0 rounded-lg border px-3 text-sm font-semibold leading-9", grade === null ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted")}>
          Бүгд
        </Link>
        {GRADES.map((g) => (
          <Link key={g} href={`/student/exams?grade=${g}`} className={cn("h-9 shrink-0 rounded-lg border px-3 text-sm font-semibold leading-9", g === grade ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:text-fg")}>
            {g}-р анги
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {exams.length === 0 ? (
            <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="Нээлттэй шалгалт алга" description="Өөр анги сонгох эсвэл багш шалгалт нийтлэхийг хүлээнэ үү." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {exams.map((e) => {
                const state = examIsOpen(e);
                const inProgress = e.attempts.find((a) => a.status === "IN_PROGRESS");
                const best = e.attempts.filter((a) => a.percentage !== null).reduce<number | null>((m, a) => Math.max(m ?? 0, a.percentage!), null);
                return (
                  <Card key={e.id} className="flex flex-col p-5">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="primary">{e.gradeId}-р анги</Badge>
                      {best !== null && <Badge tone={best >= e.passingScore ? "success" : "warning"}>Шилдэг: {best}%</Badge>}
                      {!state.open && <Badge tone="neutral">{state.reason}</Badge>}
                    </div>
                    <h3 className="mt-3 font-display text-base font-semibold leading-snug">{e.title}</h3>
                    {e.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{e.description}</p>}
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <FileQuestion className="h-3.5 w-3.5" /> {e._count.questions} асуулт
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {e.durationMinutes} мин
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" /> Тэнцэх {e.passingScore}%
                      </span>
                    </div>
                    <div className="mt-auto pt-5">
                      <LinkButton href={inProgress ? `/student/exams/attempt/${inProgress.id}` : `/student/exams/${e.id}`} className={cn("w-full", !state.open && !inProgress && "pointer-events-none opacity-50")} variant={inProgress ? "primary" : "outline"}>
                        {inProgress ? "Үргэлжлүүлэх" : e.attempts.length ? "Дахин өгөх" : "Эхлэх"}
                      </LinkButton>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader title="Миний оролдлогууд" icon={<History className="h-4 w-4" />} />
          <CardBody className="pt-3">
            {attempts.length === 0 ? (
              <p className="text-sm text-muted">Одоогоор шалгалт өгөөгүй байна.</p>
            ) : (
              <ul className="divide-y divide-border">
                {attempts.map((a) => (
                  <li key={a.id}>
                    <Link href={a.status === "IN_PROGRESS" ? `/student/exams/attempt/${a.id}` : `/student/exams/result/${a.id}`} className="flex items-center gap-3 py-3 hover:text-primary">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.exam.title}</p>
                        <p className="text-xs text-subtle">{formatDateTime(a.startedAt)}</p>
                      </div>
                      {a.status === "IN_PROGRESS" ? (
                        <Badge tone="info">Үргэлжилж буй</Badge>
                      ) : (
                        <Badge tone={(a.percentage ?? 0) >= a.exam.passingScore ? "success" : "danger"}>{a.percentage}%</Badge>
                      )}
                    </Link>
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
