import { z } from "zod";
import { db, parseJson } from "@/lib/db";
import { HttpError, requireApiRole } from "@/lib/auth";
import { ok, rateLimit, route } from "@/lib/api";
import { gradeAnswer } from "@/services/mathematics/equivalence";
import { recordActivity } from "@/features/gamification/server";
import { XP_RULES } from "@/lib/constants";

const schema = z.object({
  questionId: z.string(),
  answer: z.string().trim().min(1, "Хариултаа оруулна уу.").max(1000),
  timeSpentSec: z.coerce.number().int().min(0).max(36000).default(0),
});

export const POST = route(async (req) => {
  const user = await requireApiRole(["STUDENT"]);
  rateLimit(`practice:${user.id}`, 200, 60 * 60_000);
  const { questionId, answer, timeSpentSec } = schema.parse(await req.json());
  const q = await db.question.findUnique({ where: { id: questionId }, include: { options: true, solutions: true } });
  // Зөвхөн нийтлэгдсэн (баталгаажсан) бодлогыг дасгалд ашиглана
  if (!q || q.status !== "PUBLISHED") throw new HttpError(404, "Бодлого олдсонгүй.");
  if (q.type === "OPEN") throw new HttpError(400, "Нээлттэй бодлогыг автоматаар шалгах боломжгүй.");

  const isCorrect = gradeAnswer(q, answer) === true;
  await db.practiceAnswer.create({ data: { userId: user.id, questionId, answer, isCorrect, timeSpentSec } });
  await db.question.update({ where: { id: questionId }, data: { timesAnswered: { increment: 1 }, timesCorrect: { increment: isCorrect ? 1 : 0 } } });
  const xp = isCorrect ? XP_RULES.PRACTICE_CORRECT : XP_RULES.PRACTICE_WRONG;
  const achievements = await recordActivity(user.id, { problems: 1, correct: isCorrect ? 1 : 0, xp, minutes: Math.round(timeSpentSec / 60) });

  const verified = q.solutions.find((s) => s.isVerified) ?? q.solutions.find((s) => !s.isAiGenerated);
  return ok({
    isCorrect,
    correctAnswer: q.type === "MULTIPLE_CHOICE" ? (q.options.find((o) => o.isCorrect)?.label ?? q.correctAnswer) : q.correctAnswer,
    explanation: q.explanation,
    steps: verified ? parseJson<{ title: string; latex?: string; explanation: string }[]>(verified.steps, []) : [],
    xp,
    achievements,
  });
});
