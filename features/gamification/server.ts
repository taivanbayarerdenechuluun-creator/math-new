// XP, түвшин, цуврал (streak), амжилтын тэмдэг.
import "server-only";
import { db } from "@/lib/db";
import { addDays, dayKey, levelFromXp } from "@/lib/utils";

export const ACHIEVEMENTS = [
  { code: "FIRST_SOLVE", title: "Анхны алхам", description: "Анхны бодлогоо бодлоо", icon: "sparkles", xpReward: 20 },
  { code: "TEN_CORRECT", title: "Зөв эхлэл", description: "10 бодлогыг зөв бодлоо", icon: "target", xpReward: 50 },
  { code: "FIFTY_CORRECT", title: "Бодлогын мастер", description: "50 бодлогыг зөв бодлоо", icon: "medal", xpReward: 150 },
  { code: "STREAK_3", title: "Тогтвортой", description: "3 өдөр дараалан суралцлаа", icon: "flame", xpReward: 40 },
  { code: "STREAK_7", title: "Долоо хоногийн аварга", description: "7 өдөр дараалан суралцлаа", icon: "flame", xpReward: 100 },
  { code: "FIRST_LESSON", title: "Мэдлэгийн эхлэл", description: "Анхны хичээлээ дуусгалаа", icon: "book", xpReward: 20 },
  { code: "FIVE_LESSONS", title: "Шамдас сурагч", description: "5 хичээл дуусгалаа", icon: "library", xpReward: 80 },
  { code: "FIRST_EXAM", title: "Шалгалтын баатар", description: "Анхны шалгалтаа өглөө", icon: "clipboard", xpReward: 40 },
  { code: "EXAM_PASS", title: "Тэнцлээ!", description: "Шалгалтад тэнцлээ", icon: "award", xpReward: 60 },
  { code: "EXAM_PERFECT", title: "Төгс оноо", description: "Шалгалтад 100% авлаа", icon: "crown", xpReward: 150 },
  { code: "AI_CURIOUS", title: "Сониуч оюун", description: "AI багштай 5 яриа өрнүүллээ", icon: "bot", xpReward: 30 },
  { code: "LEVEL_5", title: "5-р түвшин", description: "5-р түвшинд хүрлээ", icon: "star", xpReward: 100 },
] as const;

/** Өдрийн идэвхийг бүртгэж, XP нэмж, streak шинэчилнэ */
export async function recordActivity(
  userId: string,
  delta: { problems?: number; correct?: number; lessons?: number; minutes?: number; xp?: number },
) {
  const today = dayKey();
  await db.dailyActivity.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      problemsSolved: delta.problems ?? 0,
      correct: delta.correct ?? 0,
      lessonsDone: delta.lessons ?? 0,
      minutes: delta.minutes ?? 0,
      xpEarned: delta.xp ?? 0,
    },
    update: {
      problemsSolved: { increment: delta.problems ?? 0 },
      correct: { increment: delta.correct ?? 0 },
      lessonsDone: { increment: delta.lessons ?? 0 },
      minutes: { increment: delta.minutes ?? 0 },
      xpEarned: { increment: delta.xp ?? 0 },
    },
  });

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  let streak = user.streak;
  if (user.lastActiveDate !== today) {
    streak = user.lastActiveDate === addDays(today, -1) ? user.streak + 1 : 1;
  }
  await db.user.update({
    where: { id: userId },
    data: {
      xp: { increment: delta.xp ?? 0 },
      streak,
      longestStreak: Math.max(user.longestStreak, streak),
      lastActiveDate: today,
    },
  });
  return checkAchievements(userId);
}

async function award(userId: string, code: string) {
  const def = ACHIEVEMENTS.find((a) => a.code === code)!;
  const ach = await db.achievement.upsert({
    where: { code },
    create: { code, title: def.title, description: def.description, icon: def.icon, xpReward: def.xpReward },
    update: {},
  });
  const exists = await db.userAchievement.findUnique({ where: { userId_achievementId: { userId, achievementId: ach.id } } });
  if (exists) return null;
  await db.userAchievement.create({ data: { userId, achievementId: ach.id } });
  await db.user.update({ where: { id: userId }, data: { xp: { increment: ach.xpReward } } });
  await db.notification.create({
    data: { userId, title: `Шинэ амжилт: ${ach.title}`, body: `${ach.description}. +${ach.xpReward} XP`, link: "/student/progress" },
  });
  return ach;
}

/** Нөхцөл хангасан амжилтуудыг олгоно. Шинээр олгосон амжилтуудыг буцаана. */
export async function checkAchievements(userId: string) {
  const [user, practiceTotal, practiceCorrect, problems, lessons, attempts, convos, owned] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.practiceAnswer.count({ where: { userId } }),
    db.practiceAnswer.count({ where: { userId, isCorrect: true } }),
    db.solvedProblem.count({ where: { userId } }),
    db.learningProgress.count({ where: { userId } }),
    db.examinationAttempt.findMany({ where: { userId, status: { not: "IN_PROGRESS" } }, include: { exam: true } }),
    db.aiConversation.count({ where: { userId } }),
    db.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
  ]);
  const have = new Set(owned.map((o) => o.achievement.code));
  const earned: string[] = [];
  const check = (code: string, cond: boolean) => {
    if (cond && !have.has(code)) earned.push(code);
  };
  check("FIRST_SOLVE", practiceTotal + problems > 0);
  check("TEN_CORRECT", practiceCorrect >= 10);
  check("FIFTY_CORRECT", practiceCorrect >= 50);
  check("STREAK_3", user.streak >= 3);
  check("STREAK_7", user.streak >= 7);
  check("FIRST_LESSON", lessons >= 1);
  check("FIVE_LESSONS", lessons >= 5);
  check("FIRST_EXAM", attempts.length >= 1);
  check("EXAM_PASS", attempts.some((a) => (a.percentage ?? 0) >= a.exam.passingScore));
  check("EXAM_PERFECT", attempts.some((a) => (a.percentage ?? 0) >= 100));
  check("AI_CURIOUS", convos >= 5);
  check("LEVEL_5", levelFromXp(user.xp).level >= 5);

  const results = [];
  for (const code of earned) {
    const a = await award(userId, code);
    if (a) results.push({ code: a.code, title: a.title, xp: a.xpReward });
  }
  return results;
}
