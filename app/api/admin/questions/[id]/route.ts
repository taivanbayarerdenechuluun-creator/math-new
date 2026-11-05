import { db } from "@/lib/db";
import { HttpError, canManageGrade, requireApiRole, STAFF } from "@/lib/auth";
import { audit, ok, route } from "@/lib/api";
import { questionInputSchema } from "@/features/question-bank/schema";
import { updateQuestion } from "@/features/question-bank/server";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, { params }) => {
  const user = await requireApiRole(STAFF);
  const { id } = await params;
  const input = questionInputSchema.parse(await req.json());
  const q = await updateQuestion(id, input, user);
  return ok({ id: q.id, status: q.status });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireApiRole(STAFF);
  const { id } = await params;
  const q = await db.question.findUnique({ where: { id }, include: { _count: { select: { examLinks: true } } } });
  if (!q) throw new HttpError(404, "Бодлого олдсонгүй.");
  if (!(await canManageGrade(user, q.gradeId))) throw new HttpError(403, "Эрх байхгүй.");
  if (q.status === "PUBLISHED") throw new HttpError(400, "Нийтлэгдсэн бодлогыг устгахын өмнө нийтлэлээс буцаана уу.");
  if (q._count.examLinks > 0) throw new HttpError(400, "Энэ бодлого шалгалтад ашиглагдаж байгаа тул устгах боломжгүй.");
  if (user.role !== "ADMIN" && q.authorId !== user.id) throw new HttpError(403, "Зөвхөн өөрийн үүсгэсэн бодлогыг устгана.");
  await db.question.delete({ where: { id } });
  await audit(user.id, "DELETE", "question", id, { code: q.code });
  return ok({ ok: true });
});
