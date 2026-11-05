// Сурагчийн ахицын шинжилгээ — бүх тоо бодит DB бичлэгээс тооцоологдоно.
import "server-only";
import { db } from "@/lib/db";
import { addDays, dayKey, levelFromXp, pct } from "@/lib/utils";

export interface TopicStat {
  topicId: string;
  title: string;
  grade: number;
  attempts: number;
  correct: number;
  accuracy: number;
}

/** Сэдэв бүрийн нарийвчлал (дасгал + шалгалтын хариулт) */
export async function topicStats(userId: string): Promise<TopicStat[]> {
  const [practice, examAnswers] = await Promise.all([
    db.practiceAnswer.findMany({
      where: { userId },
      select: { isCorrect: true, question: { select: { topicId: true } } },
    }),
    db.studentAnswer.findMany({
      where: { attempt: { userId, status: { not: "IN_PROGRESS" } }, isCorrect: { not: null } },
      select: { isCorrect: true, question: { select: { topicId: true } } },
    }),
  ]);
  const map = new Map<string, { a: number; c: number }>();
  for (const r of [...practice, ...examAnswers]) {
    const t = r.question.topicId;
    if (!t) continue;
    const m = map.get(t) ?? { a: 0, c: 0 };
    m.a++;
    if (r.isCorrect) m.c++;
    map.set(t, m);
  }
  if (map.size === 0) return [];
  const topics = await db.topic.findMany({
    where: { id: { in: [...map.keys()] } },
    select: { id: true, title: true, unit: { select: { gradeId: true } } },
  });
  return topics
    .map((t) => {
      const m = map.get(t.id)!;
      return { topicId: t.id, title: t.title, grade: t.unit.gradeId, attempts: m.a, correct: m.c, accuracy: pct(m.c, m.a) };
    })
    .sort((a, b) => b.accuracy - a.accuracy);
}

/** Урьдчилсан нөхцөл болох сэдвүүдийг эзэмшсэн эсэх (≥60% нарийвчлал ≥3 оролдлого, эсвэл бүх хичээл дууссан) */
export async function unlockedTopicIds(userId: string, topicIds: string[]): Promise<Set<string>> {
  const prereqs = await db.topicPrerequisite.findMany({
    where: { topicId: { in: topicIds } },
    include: { prerequisite: { include: { lessons: { select: { id: true } } } } },
  });
  if (prereqs.length === 0) return new Set(topicIds);
  const stats = await topicStats(userId);
  const done = new Set(
    (await db.learningProgress.findMany({ where: { userId }, select: { lessonId: true } })).map((l) => l.lessonId),
  );
  const mastered = (pid: string, lessonIds: string[]) => {
    const s = stats.find((x) => x.topicId === pid);
    if (s && s.attempts >= 3 && s.accuracy >= 60) return true;
    return lessonIds.length > 0 && lessonIds.every((id) => done.has(id));
  };
  const unlocked = new Set<string>();
  for (const id of topicIds) {
    const reqs = prereqs.filter((p) => p.topicId === id);
    if (reqs.every((r) => mastered(r.prerequisiteId, r.prerequisite.lessons.map((l) => l.id)))) unlocked.add(id);
  }
  return unlocked;
}

export async function getStudentOverview(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const today = dayKey();
  const from30 = addDays(today, -29);

  const [activity, practiceTotal, practiceCorrect, lessonsDone, gradeLessons, attempts, problems, saved, achievements, stats, recentPractice, recentProblems] =
    await Promise.all([
      db.dailyActivity.findMany({ where: { userId, date: { gte: from30 } }, orderBy: { date: "asc" } }),
      db.practiceAnswer.count({ where: { userId } }),
      db.practiceAnswer.count({ where: { userId, isCorrect: true } }),
      db.learningProgress.count({ where: { userId, lesson: user.grade ? { topic: { unit: { gradeId: user.grade } } } : undefined } }),
      db.lesson.count({ where: { isPublished: true, topic: user.grade ? { unit: { gradeId: user.grade } } : undefined } }),
      db.examinationAttempt.findMany({
        where: { userId, status: { not: "IN_PROGRESS" } },
        include: { exam: { select: { title: true, passingScore: true } } },
        orderBy: { submittedAt: "desc" },
      }),
      db.solvedProblem.count({ where: { userId } }),
      db.savedQuestion.count({ where: { userId } }),
      db.userAchievement.findMany({ where: { userId }, include: { achievement: true }, orderBy: { earnedAt: "desc" } }),
      topicStats(userId),
      db.practiceAnswer.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { question: { select: { code: true, title: true, text: true, topic: { select: { title: true } } } } },
      }),
      db.solvedProblem.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  // Сүүлийн 30 өдрийн цуваа (хоосон өдрүүдийг 0-ээр бөглөнө)
  const byDate = new Map(activity.map((a) => [a.date, a]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(from30, i);
    const a = byDate.get(d);
    return { date: d, problems: a?.problemsSolved ?? 0, correct: a?.correct ?? 0, minutes: a?.minutes ?? 0, xp: a?.xpEarned ?? 0, lessons: a?.lessonsDone ?? 0 };
  });
  const todayAct = byDate.get(today);

  const reliable = stats.filter((s) => s.attempts >= 3);
  const strongest = reliable.slice(0, 3);
  const weakest = [...reliable].sort((a, b) => a.accuracy - b.accuracy).filter((s) => s.accuracy < 75).slice(0, 3);

  // Шалгалтын бэлэн байдал — тооцоолол (баталгаа биш)
  const accuracy = pct(practiceCorrect, practiceTotal);
  const recentExams = attempts.slice(0, 3);
  const examAvg = recentExams.length ? recentExams.reduce((s, a) => s + (a.percentage ?? 0), 0) / recentExams.length : null;
  const coverage = pct(lessonsDone, gradeLessons);
  const dataPoints = practiceTotal + attempts.length * 5;
  const readiness =
    dataPoints < 10
      ? null
      : Math.round(examAvg !== null ? examAvg * 0.5 + accuracy * 0.3 + coverage * 0.2 : accuracy * 0.65 + coverage * 0.35);

  return {
    user: { ...user, levelInfo: levelFromXp(user.xp) },
    totals: {
      practiceTotal,
      practiceCorrect,
      accuracy,
      lessonsDone,
      gradeLessons,
      coverage,
      problems,
      saved,
      examsTaken: attempts.length,
      todayProblems: todayAct?.problemsSolved ?? 0,
    },
    days,
    week: days.slice(-7),
    stats,
    strongest,
    weakest,
    readiness,
    examAvg,
    attempts,
    achievements,
    recentPractice,
    recentProblems,
  };
}

/** Сул сэдвүүд дээр суурилсан хувийн зөвлөмж (урьдчилсан нөхцөлийн дарааллаар) */
export async function getRecommendations(userId: string, grade: number | null) {
  const stats = await topicStats(userId);
  const weak = stats.filter((s) => s.attempts >= 2 && s.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  const done = new Set((await db.learningProgress.findMany({ where: { userId }, select: { lessonId: true } })).map((l) => l.lessonId));

  const recs: { kind: "REVIEW" | "PREREQ" | "NEXT"; title: string; reason: string; href: string }[] = [];
  for (const w of weak) {
    const topic = await db.topic.findUnique({
      where: { id: w.topicId },
      include: { lessons: { orderBy: { order: "asc" } }, prerequisites: { include: { prerequisite: true } } },
    });
    if (!topic) continue;
    for (const p of topic.prerequisites) {
      recs.push({
        kind: "PREREQ",
        title: `Суурь сэдэв давтах: ${p.prerequisite.title}`,
        reason: `"${topic.title}" сэдэвт таны нарийвчлал ${w.accuracy}% байна. Эхлээд суурь сэдвээ бататгая.`,
        href: `/student/learn/topic/${p.prerequisite.slug}`,
      });
    }
    const lesson = topic.lessons.find((l) => !done.has(l.id)) ?? topic.lessons[0];
    if (lesson)
      recs.push({
        kind: "REVIEW",
        title: `Хичээл давтах: ${lesson.title}`,
        reason: `${topic.title} — ${w.correct}/${w.attempts} зөв. Онолоо давтаад дасгал ажиллая.`,
        href: `/student/learn/lesson/${lesson.id}`,
      });
    recs.push({
      kind: "REVIEW",
      title: `Дасгал: ${topic.title}`,
      reason: "Хялбараас хүнд рүү ахиулсан дасгал ажиллах",
      href: `/student/practice?topic=${topic.slug}`,
    });
  }
  // Дараагийн дуусаагүй хичээл
  if (grade) {
    const next = await db.lesson.findFirst({
      where: { isPublished: true, id: { notIn: [...done] }, topic: { unit: { gradeId: grade } } },
      orderBy: [{ topic: { unit: { order: "asc" } } }, { topic: { order: "asc" } }, { order: "asc" }],
      include: { topic: true },
    });
    if (next) recs.push({ kind: "NEXT", title: `Үргэлжлүүлэх: ${next.title}`, reason: next.topic.title, href: `/student/learn/lesson/${next.id}` });
  }
  return recs.slice(0, 6);
}
