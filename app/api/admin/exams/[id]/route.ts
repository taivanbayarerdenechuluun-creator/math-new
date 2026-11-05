import { db } from "@/lib/db";
import { HttpError, canManageGrade, requireApiRole, STAFF } from "@/lib/auth";
import { audit, ok, route } from "@/lib/api";
import { examSchema, toDate, validateExamQuestions } from "@/features/examinations/schema";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, { params }) => {
  const user = await requireApiRole(STAFF);
  const { id } = await params;
  const exam = await db.examination.findUnique({ where: { id }, include: { _count: { select: { attempts: true } } } });
  if (!exam) throw new HttpError(404, "Шалгалт олдсонгүй.");
  const d = examSchema.parse(await req.json());
  if (!(await canManageGrade(user, exam.gradeId)) || !(await canManageGrade(user, d.gradeId))) throw new HttpError(403, "Эрх байхгүй.");
  await validateExamQuestions(d.questions.map((q) => q.questionId));

  const current = await db.examinationQuestion.findMany({ where: { examId: id } });
  const sameQuestions =
    current.length === d.questions.length && d.questions.every((q) => current.some((c) => c.questionId === q.questionId && c.points === q.points));
  // Өгөгдсөн оролдлого байгаа бол асуултын бүрэлдэхүүнийг өөрчилж болохгүй (дүнгийн шударга байдал)
  if (exam._count.attempts > 0 && !sameQuestions) throw new HttpError(400, "Энэ шалгалтыг сурагчид өгсөн тул асуултыг өөрчлөх боломжгүй. Шинэ шалгалт үүсгэнэ үү.");

  await db.$transaction([
    ...(sameQuestions ? [] : [db.examinationQuestion.deleteMany({ where: { examId: id } })]),
    db.examination.update({
      where: { id },
      data: {
        title: d.title,
        description: d.description || null,
        gradeId: d.gradeId,
        durationMinutes: d.durationMinutes,
        passingScore: d.passingScore,
        randomize: d.randomize,
        showSolutions: d.showSolutions,
        isPublished: d.isPublished,
        availableFrom: toDate(d.availableFrom),
        availableTo: toDate(d.availableTo),
        ...(sameQuestions ? {} : { questions: { create: d.questions.map((q, i) => ({ questionId: q.questionId, points: q.points, order: i })) } }),
      },
    }),
  ]);
  await audit(user.id, "UPDATE", "examination", id);
  return ok({ id });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireApiRole(STAFF);
  const { id } = await params;
  const exam = await db.examination.findUnique({ where: { id }, include: { _count: { select: { attempts: true } } } });
  if (!exam) throw new HttpError(404, "Шалгалт олдсонгүй.");
  if (!(await canManageGrade(user, exam.gradeId))) throw new HttpError(403, "Эрх байхгүй.");
  if (exam._count.attempts > 0) throw new HttpError(400, "Сурагчид өгсөн шалгалтыг устгах боломжгүй. Нийтлэлээс буцааж болно.");
  await db.examination.delete({ where: { id } });
  await audit(user.id, "DELETE", "examination", id);
  return ok({ ok: true });
});
