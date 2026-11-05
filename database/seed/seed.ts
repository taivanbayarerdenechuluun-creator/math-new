/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { CURRICULUM, VERIFICATION_NOTE } from "./curriculum";
import { EXAMS, QUESTIONS } from "./questions";
import { syncContent } from "./sync-content";

const db = new PrismaClient();

function hash(text: string) {
  return crypto.createHash("sha1").update(text.toLowerCase().replace(/\s+/g, "").replace(/[$\\{}]/g, "")).digest("hex");
}
function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(d);
}
// Давтагдах боломжтой псевдо-санамсаргүй тоо (seed бүрт ижил демо өгөгдөл)
let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

const ACHIEVEMENTS = [
  ["FIRST_SOLVE", "Анхны алхам", "Анхны бодлогоо бодлоо", "sparkles", 20],
  ["TEN_CORRECT", "Зөв эхлэл", "10 бодлогыг зөв бодлоо", "target", 50],
  ["FIFTY_CORRECT", "Бодлогын мастер", "50 бодлогыг зөв бодлоо", "medal", 150],
  ["STREAK_3", "Тогтвортой", "3 өдөр дараалан суралцлаа", "flame", 40],
  ["STREAK_7", "Долоо хоногийн аварга", "7 өдөр дараалан суралцлаа", "flame", 100],
  ["FIRST_LESSON", "Мэдлэгийн эхлэл", "Анхны хичээлээ дуусгалаа", "book", 20],
  ["FIVE_LESSONS", "Шамдас сурагч", "5 хичээл дуусгалаа", "library", 80],
  ["FIRST_EXAM", "Шалгалтын баатар", "Анхны шалгалтаа өглөө", "clipboard", 40],
  ["EXAM_PASS", "Тэнцлээ!", "Шалгалтад тэнцлээ", "award", 60],
  ["EXAM_PERFECT", "Төгс оноо", "Шалгалтад 100% авлаа", "crown", 150],
  ["AI_CURIOUS", "Сониуч оюун", "AI багштай 5 яриа өрнүүллээ", "bot", 30],
  ["LEVEL_5", "5-р түвшин", "5-р түвшинд хүрлээ", "star", 100],
] as const;

async function main() {
  const existing = await db.user.count();
  if (existing > 0) {
    console.log("⚠ Өгөгдлийн сан хоосон биш байна. Дахин эхлүүлэх бол: npm run db:reset");
    return;
  }

  console.log("→ Хэрэглэгчид");
  const [admin, teacher, teacher2, student] = await Promise.all([
    db.user.create({ data: { email: "admin@iqmath.mn", name: "Системийн админ", role: "ADMIN", passwordHash: await bcrypt.hash("Admin123!", 11), avatarColor: "indigo" } }),
    db.user.create({ data: { email: "teacher@iqmath.mn", name: "Б. Сарангэрэл багш", role: "TEACHER", passwordHash: await bcrypt.hash("Teacher123!", 11), avatarColor: "cyan" } }),
    db.user.create({ data: { email: "teacher2@iqmath.mn", name: "Д. Батболд багш", role: "TEACHER", passwordHash: await bcrypt.hash("Teacher123!", 11), avatarColor: "emerald" } }),
    db.user.create({ data: { email: "student@iqmath.mn", name: "Тэмүүлэн", role: "STUDENT", grade: 9, passwordHash: await bcrypt.hash("Student123!", 11), avatarColor: "violet", showOnLeaderboard: true } }),
  ]);
  const others = await Promise.all(
    [
      ["Номин", 9],
      ["Билгүүн", 9],
      ["Анужин", 8],
      ["Хулан", 12],
      ["Мөнх-Эрдэнэ", 10],
    ].map(async ([name, grade], i) =>
      db.user.create({
        data: { email: `student${i + 2}@iqmath.mn`, name: name as string, role: "STUDENT", grade: grade as number, passwordHash: await bcrypt.hash("Student123!", 11), xp: 150 + i * 120, showOnLeaderboard: true },
      }),
    ),
  );

  console.log("→ Хөтөлбөр");
  const topicIds = new Map<string, string>();
  const lessonIds: string[] = [];
  for (const g of CURRICULUM) {
    await db.grade.create({ data: { id: g.grade, name: `${g.grade}-р анги`, description: g.description } });
    for (const [ui, u] of g.units.entries()) {
      const unit = await db.curriculumUnit.create({
        data: { gradeId: g.grade, title: u.title, domain: u.domain, order: ui, isOfficial: false, verificationNote: VERIFICATION_NOTE },
      });
      for (const [ti, t] of u.topics.entries()) {
        const topic = await db.topic.create({ data: { unitId: unit.id, slug: t.slug, title: t.title, description: t.description, order: ti } });
        topicIds.set(t.slug, topic.id);
        for (const [title, latex] of t.formulas ?? []) await db.formula.create({ data: { topicId: topic.id, title, latex } });
        for (const [li, l] of (t.lessons ?? []).entries()) {
          const lesson = await db.lesson.create({
            data: { topicId: topic.id, title: l.title, summary: l.summary, content: l.content, examples: JSON.stringify(l.examples), order: li, durationMin: l.durationMin },
          });
          lessonIds.push(lesson.id);
        }
      }
    }
  }
  for (const g of CURRICULUM)
    for (const u of g.units)
      for (const t of u.topics)
        for (const p of t.prerequisites ?? []) {
          const a = topicIds.get(t.slug);
          const b = topicIds.get(p);
          if (a && b) await db.topicPrerequisite.create({ data: { topicId: a, prerequisiteId: b } });
        }

  console.log("→ Бодлогын сан");
  const source = await db.questionSource.create({ data: { name: "IQ MATH жишээ сан", type: "TEACHER", reference: "Платформын баг зохиосон жишээ бодлогууд" } });
  const ocrSource = await db.questionSource.create({ data: { name: "Сурах бичгийн скан (жишээ)", type: "IMPORT" } });
  const qid = new Map<string, string>();
  let n = 1;
  for (const q of QUESTIONS) {
    const status = q.status ?? "PUBLISHED";
    const isReview = status === "NEEDS_REVIEW";
    const created = await db.question.create({
      data: {
        code: `IQM-${String(n++).padStart(6, "0")}`,
        gradeId: q.grade,
        topicId: topicIds.get(q.topic) ?? null,
        type: q.type,
        difficulty: q.difficulty,
        text: q.text,
        correctAnswer: q.answer || null,
        tolerance: q.tolerance ?? null,
        explanation: q.explanation,
        status,
        sourceId: isReview ? ocrSource.id : source.id,
        authorId: isReview ? teacher.id : status === "DRAFT" ? teacher2.id : teacher.id,
        reviewerId: status === "PUBLISHED" ? admin.id : null,
        reviewedAt: status === "PUBLISHED" ? new Date() : null,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        originalText: isReview ? q.text.replace(/\$/g, "").replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2") : null,
        ocrConfidence: isReview ? 0.74 : null,
        aiGenerated: isReview,
        contentHash: hash(q.text),
        tags: q.topic.split("-").slice(1).join(","),
        options: { create: (q.options ?? []).map(([label, text], i) => ({ label, text, isCorrect: label === q.answer, order: i })) },
        solutions: q.steps
          ? {
              create: {
                steps: JSON.stringify(q.steps.map(([title, latex, explanation]) => ({ title, latex, explanation }))),
                finalAnswer: q.answer,
                isVerified: status === "PUBLISHED",
                isAiGenerated: false,
              },
            }
          : isReview
            ? { create: { steps: JSON.stringify([{ title: "AI санал болгосон бодолт", latex: "", explanation: q.explanation }]), finalAnswer: q.answer, isAiGenerated: true } }
            : undefined,
      },
    });
    qid.set(q.key, created.id);
    if (status === "PUBLISHED") await db.questionReview.create({ data: { questionId: created.id, reviewerId: admin.id, action: "PUBLISH", comment: "Жишээ сан — шалгаж нийтлэв" } });
  }

  console.log("→ Шалгалт");
  const examIds: string[] = [];
  for (const e of EXAMS) {
    const exam = await db.examination.create({
      data: {
        title: e.title,
        description: e.description,
        gradeId: e.grade,
        durationMinutes: e.duration,
        passingScore: e.passing,
        isPublished: true,
        randomize: true,
        createdById: teacher.id,
        questions: { create: e.keys.map((k, i) => ({ questionId: qid.get(k)!, order: i, points: 1 })) },
      },
    });
    examIds.push(exam.id);
  }

  console.log("→ Амжилтууд");
  for (const [code, title, description, icon, xpReward] of ACHIEVEMENTS) {
    await db.achievement.create({ data: { code, title, description, icon, xpReward } });
  }

  console.log("→ Демо сурагчийн түүх (бодит бичлэгүүд)");
  // Сүүлийн 14 өдрийн дасгалын хариултууд — 8, 9-р ангийн нийтлэгдсэн бодлогууд дээр
  const pool = QUESTIONS.filter((q) => (q.grade === 8 || q.grade === 9 || q.grade === 7) && (q.status ?? "PUBLISHED") === "PUBLISHED");
  const today = new Date();
  let xp = 0;
  let streakDays = 0;
  for (let d = 13; d >= 0; d--) {
    if (d > 6 && rand() < 0.3) continue; // хэдэн өдөр алгассан
    const date = new Date(today.getTime() - d * 86400000);
    const count = 3 + Math.floor(rand() * 6);
    let correct = 0;
    for (let i = 0; i < count; i++) {
      const q = pool[Math.floor(rand() * pool.length)];
      // Квадрат тэгшитгэл, тригонометр дээр сул байхаар загварчилсан
      const weak = q.topic.startsWith("g9-quadratic") || q.topic === "g9-right-trig";
      const ok = rand() < (weak ? 0.45 : 0.85);
      if (ok) correct++;
      await db.practiceAnswer.create({
        data: { userId: student.id, questionId: qid.get(q.key)!, answer: ok ? q.answer : "?", isCorrect: ok, timeSpentSec: 30 + Math.floor(rand() * 120), createdAt: date },
      });
      await db.question.update({ where: { id: qid.get(q.key)! }, data: { timesAnswered: { increment: 1 }, timesCorrect: { increment: ok ? 1 : 0 } } });
    }
    const dxp = correct * 10 + (count - correct) * 2;
    xp += dxp;
    if (d <= 6) streakDays++;
    await db.dailyActivity.create({
      data: { userId: student.id, date: dayKey(date), problemsSolved: count, correct, minutes: 10 + Math.floor(rand() * 30), xpEarned: dxp, lessonsDone: d % 4 === 0 ? 1 : 0 },
    });
  }
  // Дуусгасан хичээлүүд
  const g8g9Lessons = await db.lesson.findMany({ where: { topic: { unit: { gradeId: { in: [7, 8] } } } }, take: 4 });
  for (const l of g8g9Lessons) await db.learningProgress.create({ data: { userId: student.id, lessonId: l.id } });
  xp += g8g9Lessons.length * 25;

  // 8-р ангийн шалгалтын дууссан оролдлого
  const exam8 = EXAMS[1];
  const started = new Date(today.getTime() - 3 * 86400000);
  const order = exam8.keys.map((k) => qid.get(k)!);
  const attempt = await db.examinationAttempt.create({
    data: {
      examId: examIds[1],
      userId: student.id,
      status: "SUBMITTED",
      questionOrder: JSON.stringify(order),
      startedAt: started,
      deadline: new Date(started.getTime() + 15 * 60000),
      submittedAt: new Date(started.getTime() + 11 * 60000),
    },
  });
  let score = 0;
  for (const [i, k] of exam8.keys.entries()) {
    const q = QUESTIONS.find((x) => x.key === k)!;
    const ok = i !== 1 && i !== 4; // 2 алдаатай
    if (ok) score++;
    await db.studentAnswer.create({
      data: { attemptId: attempt.id, questionId: qid.get(k)!, answer: ok ? q.answer : q.type === "MULTIPLE_CHOICE" ? "A" : "7", isCorrect: ok, pointsAwarded: ok ? 1 : 0, gradedBy: "AUTO" },
    });
  }
  await db.examinationAttempt.update({ where: { id: attempt.id }, data: { score, maxScore: 7, percentage: Math.round((score / 7) * 1000) / 10 } });
  xp += 30 + 50;

  // Олгогдсон амжилтууд
  for (const code of ["FIRST_SOLVE", "TEN_CORRECT", "FIRST_LESSON", "FIRST_EXAM", "EXAM_PASS", "STREAK_3"]) {
    const a = await db.achievement.findUniqueOrThrow({ where: { code } });
    await db.userAchievement.create({ data: { userId: student.id, achievementId: a.id } });
    xp += a.xpReward;
  }
  await db.user.update({ where: { id: student.id }, data: { xp, streak: streakDays, longestStreak: streakDays, lastActiveDate: dayKey(today) } });
  await db.notification.create({ data: { userId: student.id, title: "IQ MATH-д тавтай морил!", body: "Өдрийн зорилгоо тавьж, анхны бодлогоо бодоорой.", link: "/student" } });

  // Бусад сурагчдад жижиг идэвх
  for (const o of others) {
    await db.dailyActivity.create({ data: { userId: o.id, date: dayKey(today), problemsSolved: 4, correct: 3, minutes: 15, xpEarned: 32 } });
  }

  console.log("→ Нэмэлт хичээл, бодлого");
  const extra = await syncContent(db);
  console.log(`  ${extra.lessons} хичээл, ${extra.questions} бодлого нэмэгдлээ`);

  await db.auditLog.create({ data: { userId: admin.id, action: "SEED", entity: "system", details: "Анхны өгөгдөл үүсгэв" } });
  console.log("✔ Дууслаа.\n  admin@iqmath.mn / Admin123!\n  teacher@iqmath.mn / Teacher123!\n  student@iqmath.mn / Student123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
