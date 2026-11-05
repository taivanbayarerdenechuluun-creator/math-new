import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireApiRole } from "@/lib/auth";
import { ok, route } from "@/lib/api";

const schema = z.object({ questionId: z.string(), note: z.string().max(500).optional() });

export const POST = route(async (req) => {
  const user = await requireApiRole(["STUDENT"]);
  const { questionId, note } = schema.parse(await req.json());
  const q = await db.question.findUnique({ where: { id: questionId }, select: { status: true } });
  if (!q || q.status !== "PUBLISHED") throw new HttpError(404, "Бодлого олдсонгүй.");
  await db.savedQuestion.upsert({
    where: { userId_questionId: { userId: user.id, questionId } },
    create: { userId: user.id, questionId, note },
    update: { note },
  });
  return ok({ saved: true });
});

export const DELETE = route(async (req) => {
  const user = await requireApiRole(["STUDENT"]);
  const { questionId } = schema.parse(await req.json());
  await db.savedQuestion.deleteMany({ where: { userId: user.id, questionId } });
  return ok({ saved: false });
});
