// Багш нээлттэй бодлогын хариуг гараар үнэлэх
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, canManageGrade, requireApiRole, STAFF } from "@/lib/auth";
import { audit, ok, route } from "@/lib/api";
import { recomputeAttempt } from "@/features/examinations/server";

const schema = z.object({ points: z.coerce.number().min(0), feedback: z.string().max(2000).optional() });

export const POST = route<{ params: Promise<{ answerId: string }> }>(async (req, { params }) => {
  const user = await requireApiRole(STAFF);
  const { answerId } = await params;
  const { points, feedback } = schema.parse(await req.json());
  const ans = await db.studentAnswer.findUnique({ where: { id: answerId }, include: { attempt: { include: { exam: { include: { questions: true } } } } } });
  if (!ans) throw new HttpError(404, "Хариулт олдсонгүй.");
  if (!(await canManageGrade(user, ans.attempt.exam.gradeId))) throw new HttpError(403, "Эрх байхгүй.");
  if (ans.attempt.status === "IN_PROGRESS") throw new HttpError(400, "Шалгалт дуусаагүй байна.");
  const max = ans.attempt.exam.questions.find((q) => q.questionId === ans.questionId)?.points ?? 1;
  if (points > max) throw new HttpError(400, `Хамгийн их оноо ${max}.`);
  await db.studentAnswer.update({
    where: { id: answerId },
    data: { pointsAwarded: points, isCorrect: points >= max, gradedBy: "TEACHER", feedback: feedback || null },
  });
  const attempt = await recomputeAttempt(ans.attemptId);
  await db.notification.create({
    data: { userId: ans.attempt.userId, title: "Шалгалтын дүн шинэчлэгдлээ", body: `${ans.attempt.exam.title}: багш нээлттэй бодлогыг үнэллээ.`, link: `/student/exams/result/${ans.attemptId}` },
  });
  await audit(user.id, "GRADE", "student_answer", answerId, { points });
  return ok({ percentage: attempt.percentage });
});
