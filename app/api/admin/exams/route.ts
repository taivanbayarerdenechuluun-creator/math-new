import { db } from "@/lib/db";
import { HttpError, canManageGrade, requireApiRole, STAFF } from "@/lib/auth";
import { audit, ok, route } from "@/lib/api";
import { examSchema, toDate, validateExamQuestions } from "@/features/examinations/schema";

export const POST = route(async (req) => {
  const user = await requireApiRole(STAFF);
  const d = examSchema.parse(await req.json());
  if (!(await canManageGrade(user, d.gradeId))) throw new HttpError(403, "Энэ ангид шалгалт үүсгэх эрхгүй.");
  await validateExamQuestions(d.questions.map((q) => q.questionId));
  const exam = await db.examination.create({
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
      createdById: user.id,
      questions: { create: d.questions.map((q, i) => ({ questionId: q.questionId, points: q.points, order: i })) },
    },
  });
  await audit(user.id, "CREATE", "examination", exam.id);
  return ok({ id: exam.id }, { status: 201 });
});
