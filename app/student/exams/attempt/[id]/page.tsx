import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { db, parseJson } from "@/lib/db";
import { submitAttempt } from "@/features/examinations/server";
import { ExamRunner, type ExamQuestion } from "./exam-runner";

export const metadata = { title: "Шалгалт өгч байна" };

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(["STUDENT"]);
  const { id } = await params;
  const attempt = await db.examinationAttempt.findUnique({ where: { id }, include: { exam: true, answers: true } });
  if (!attempt || attempt.userId !== user.id) notFound();
  if (attempt.status !== "IN_PROGRESS") redirect(`/student/exams/result/${id}`);
  // Хугацаа дууссан бол серверт шууд үнэлнэ (клиент хаагдсан байсан ч)
  if (attempt.deadline.getTime() + 15_000 < Date.now()) {
    await submitAttempt(id, user.id, true);
    redirect(`/student/exams/result/${id}`);
  }

  const order = parseJson<string[]>(attempt.questionOrder, []);
  const qs = await db.question.findMany({
    where: { id: { in: order } },
    select: { id: true, text: true, type: true, options: { orderBy: { order: "asc" }, select: { label: true, text: true } } },
  });
  const points = await db.examinationQuestion.findMany({ where: { examId: attempt.examId }, select: { questionId: true, points: true } });
  const byId = new Map(qs.map((q) => [q.id, q]));
  // Зөв хариуг клиент рүү ИЛГЭЭХГҮЙ
  const questions: ExamQuestion[] = order
    .map((qid) => byId.get(qid))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => ({ id: q.id, text: q.text, type: q.type as ExamQuestion["type"], options: q.options, points: points.find((p) => p.questionId === q.id)?.points ?? 1 }));
  const saved = Object.fromEntries(attempt.answers.map((a) => [a.questionId, { answer: a.answer ?? "", marked: a.markedForReview }]));

  return (
    <ExamRunner
      attemptId={attempt.id}
      title={attempt.exam.title}
      deadline={attempt.deadline.getTime()}
      serverNow={Date.now()}
      questions={questions}
      saved={saved}
    />
  );
}
