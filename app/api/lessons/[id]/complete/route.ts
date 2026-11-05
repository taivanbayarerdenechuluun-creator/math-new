import { db } from "@/lib/db";
import { HttpError, requireApiRole } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { recordActivity } from "@/features/gamification/server";
import { unlockedTopicIds } from "@/features/progress/server";
import { XP_RULES } from "@/lib/constants";

export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireApiRole(["STUDENT"]);
  const { id } = await params;
  const lesson = await db.lesson.findUnique({ where: { id } });
  if (!lesson || !lesson.isPublished) throw new HttpError(404, "Хичээл олдсонгүй.");
  if (!(await unlockedTopicIds(user.id, [lesson.topicId])).has(lesson.topicId)) throw new HttpError(403, "Энэ хичээл түгжээтэй байна.");

  const existing = await db.learningProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId: id } } });
  if (existing) return ok({ xp: 0, achievements: [] });
  await db.learningProgress.create({ data: { userId: user.id, lessonId: id } });
  const achievements = await recordActivity(user.id, { lessons: 1, xp: XP_RULES.LESSON_COMPLETE, minutes: lesson.durationMin });
  return ok({ xp: XP_RULES.LESSON_COMPLETE, achievements });
});
