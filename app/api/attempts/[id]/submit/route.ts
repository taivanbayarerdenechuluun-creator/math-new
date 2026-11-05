import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { saveAnswer, submitAttempt } from "@/features/examinations/server";
import { checkAchievements } from "@/features/gamification/server";
import { db } from "@/lib/db";

// Илгээхдээ клиент дээр хадгалагдаж амжаагүй хариултуудыг хамт явуулж болно (сүлжээ тасарсан тохиолдол)
const schema = z.object({
  answers: z.array(z.object({ questionId: z.string(), answer: z.string().max(2000).nullable(), marked: z.boolean().default(false) })).max(200).default([]),
  auto: z.boolean().default(false),
});

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireApiRole(["STUDENT"]);
  const { id } = await params;
  const { answers, auto } = schema.parse(await req.json().catch(() => ({})));
  const attempt = await db.examinationAttempt.findUnique({ where: { id } });
  if (attempt?.userId === user.id && attempt.status === "IN_PROGRESS") {
    for (const a of answers) {
      await saveAnswer(id, user.id, a.questionId, a.answer, a.marked).catch(() => null); // хугацаа хэтэрсэн бол алгасна
    }
  }
  const result = await submitAttempt(id, user.id, auto);
  const achievements = await checkAchievements(user.id);
  return ok({ attemptId: result.id, percentage: result.percentage, achievements });
});
