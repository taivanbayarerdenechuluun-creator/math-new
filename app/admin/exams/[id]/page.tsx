import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, PenLine } from "lucide-react";
import { requirePageRole, STAFF } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadPublishedQuestions } from "@/features/examinations/load";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ExamForm } from "@/components/examination/exam-form";
import { GradingPanel } from "@/components/examination/grading-panel";
import { formatDateTime } from "@/lib/utils";

const local = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function ExamDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(STAFF);
  const { id } = await params;
  const exam = await db.examination.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      attempts: { include: { user: { select: { name: true, grade: true } } }, orderBy: { startedAt: "desc" } },
    },
  });
  if (!exam) notFound();
  const [pool, pending] = await Promise.all([
    loadPublishedQuestions(),
    db.studentAnswer.findMany({
      where: { attempt: { examId: id, status: { not: "IN_PROGRESS" } }, isCorrect: null, pointsAwarded: null },
      include: { attempt: { include: { user: { select: { name: true } } } }, question: { select: { text: true, explanation: true } } },
    }),
  ]);
  // Нийтлэлээс буцаагдсан ч шалгалтад байгаа асуултуудыг жагсаалтад харуулахын тулд нэмнэ
  const missing = exam.questions.filter((q) => !pool.some((p) => p.id === q.questionId)).map((q) => q.questionId);
  if (missing.length) {
    const extra = await db.question.findMany({ where: { id: { in: missing } }, include: { topic: { select: { title: true } } } });
    pool.push(...extra.map((q) => ({ id: q.id, code: q.code, text: q.text, type: q.type, difficulty: q.difficulty, gradeId: q.gradeId, topicId: q.topicId, topic: q.topic?.title ?? null })));
  }
  const submitted = exam.attempts.filter((a) => a.status !== "IN_PROGRESS");

  return (
    <div className="space-y-6">
      <Link href="/admin/exams" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Шалгалтууд
      </Link>
      <PageHeader title={exam.title} description={`${submitted.length} оролдлого · ${pending.length} үнэлгээ хүлээж буй`} />

      {pending.length > 0 && (
        <Card>
          <CardHeader title="Нээлттэй бодлогын үнэлгээ" description="Сурагчдын бодолтыг шалгаж оноо өгнө үү" icon={<PenLine className="h-4 w-4" />} />
          <CardBody>
            <GradingPanel
              items={pending.map((p) => ({
                id: p.id,
                student: p.attempt.user.name,
                question: p.question.text,
                reference: p.question.explanation,
                answer: p.answer ?? "",
                max: exam.questions.find((q) => q.questionId === p.questionId)?.points ?? 1,
              }))}
            />
          </CardBody>
        </Card>
      )}

      <ExamForm
        examId={exam.id}
        pool={pool}
        hasAttempts={exam.attempts.length > 0}
        initial={{
          title: exam.title,
          description: exam.description ?? "",
          gradeId: exam.gradeId,
          durationMinutes: exam.durationMinutes,
          passingScore: exam.passingScore,
          randomize: exam.randomize,
          showSolutions: exam.showSolutions,
          isPublished: exam.isPublished,
          availableFrom: local(exam.availableFrom),
          availableTo: local(exam.availableTo),
          questions: exam.questions.map((q) => ({ questionId: q.questionId, points: q.points })),
        }}
      />

      <Card>
        <CardHeader title="Оролдлогууд" icon={<ClipboardList className="h-4 w-4" />} />
        <CardBody className="pt-3">
          {exam.attempts.length === 0 ? (
            <p className="text-sm text-muted">Одоогоор оролдлого алга.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase text-subtle">
                  <tr><th className="py-2">Сурагч</th><th>Төлөв</th><th>Оноо</th><th>Огноо</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {exam.attempts.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2.5 font-medium">{a.user.name} <span className="text-xs text-subtle">{a.user.grade ? `${a.user.grade}-р` : ""}</span></td>
                      <td>{a.status === "IN_PROGRESS" ? <Badge tone="info">Үргэлжилж буй</Badge> : a.pendingReview ? <Badge tone="warning">Үнэлгээ хүлээж буй</Badge> : <Badge tone={(a.percentage ?? 0) >= exam.passingScore ? "success" : "danger"}>{(a.percentage ?? 0) >= exam.passingScore ? "Тэнцсэн" : "Тэнцээгүй"}</Badge>}</td>
                      <td>{a.score !== null ? `${a.score}/${a.maxScore} (${a.percentage}%)` : "—"}</td>
                      <td className="text-muted">{formatDateTime(a.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
