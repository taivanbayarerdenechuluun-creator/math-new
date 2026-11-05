// Шалгалтын бизнес логик: эхлүүлэх, хариу хадгалах, илгээх, автоматаар үнэлэх.
// Цаг дууссан эсэхийг үргэлж СЕРВЕР талд шалгана — клиентийн таймерт найдахгүй.
import "server-only";
import { db, parseJson } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { gradeAnswer } from "@/services/mathematics/equivalence";
import { recordActivity } from "@/features/gamification/server";
import { XP_RULES } from "@/lib/constants";

const GRACE_MS = 15_000; // сүлжээний сааталд зориулсан хугацаа

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function examIsOpen(exam: { isPublished: boolean; availableFrom: Date | null; availableTo: Date | null }) {
  const now = new Date();
  if (!exam.isPublished) return { open: false, reason: "Шалгалт нийтлэгдээгүй байна." };
  if (exam.availableFrom && exam.availableFrom > now) return { open: false, reason: "Шалгалт хараахан эхлээгүй байна." };
  if (exam.availableTo && exam.availableTo < now) return { open: false, reason: "Шалгалтын хугацаа дууссан." };
  return { open: true, reason: null };
}

export async function startAttempt(examId: string, userId: string) {
  const exam = await db.examination.findUnique({ where: { id: examId }, include: { questions: { orderBy: { order: "asc" } } } });
  if (!exam) throw new HttpError(404, "Шалгалт олдсонгүй.");
  const state = examIsOpen(exam);
  if (!state.open) throw new HttpError(403, state.reason!);
  if (exam.questions.length === 0) throw new HttpError(400, "Энэ шалгалтад асуулт алга.");

  // Үргэлжилж буй оролдлого байвал түүнийг буцаана (санамсаргүй refresh хийсэн тохиолдол)
  const existing = await db.examinationAttempt.findFirst({ where: { examId, userId, status: "IN_PROGRESS" } });
  if (existing) {
    if (existing.deadline.getTime() + GRACE_MS < Date.now()) {
      await submitAttempt(existing.id, userId, true);
    } else return existing;
  }

  const ids = exam.questions.map((q) => q.questionId);
  return db.examinationAttempt.create({
    data: {
      examId,
      userId,
      questionOrder: JSON.stringify(exam.randomize ? shuffle(ids) : ids),
      deadline: new Date(Date.now() + exam.durationMinutes * 60_000),
    },
  });
}

async function loadOwnedAttempt(attemptId: string, userId: string) {
  const attempt = await db.examinationAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) throw new HttpError(404, "Оролдлого олдсонгүй.");
  return attempt;
}

export async function saveAnswer(attemptId: string, userId: string, questionId: string, answer: string | null, marked: boolean) {
  const attempt = await loadOwnedAttempt(attemptId, userId);
  if (attempt.status !== "IN_PROGRESS") throw new HttpError(409, "Шалгалт аль хэдийн илгээгдсэн.");
  if (attempt.deadline.getTime() + GRACE_MS < Date.now()) {
    await submitAttempt(attemptId, userId, true);
    throw new HttpError(409, "Шалгалтын хугацаа дууссан тул автоматаар илгээгдлээ.");
  }
  const order = parseJson<string[]>(attempt.questionOrder, []);
  if (!order.includes(questionId)) throw new HttpError(400, "Энэ асуулт шалгалтад хамаарахгүй.");
  return db.studentAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, answer: answer?.slice(0, 2000) ?? null, markedForReview: marked },
    update: { answer: answer?.slice(0, 2000) ?? null, markedForReview: marked },
  });
}

/** Шалгалтыг үнэлж дуусгах. auto=true бол хугацаа дууссаны улмаас. */
export async function submitAttempt(attemptId: string, userId: string, auto = false) {
  const attempt = await loadOwnedAttempt(attemptId, userId);
  if (attempt.status !== "IN_PROGRESS") return attempt;

  const exam = await db.examination.findUniqueOrThrow({
    where: { id: attempt.examId },
    include: { questions: { include: { question: { include: { options: true } } } } },
  });
  const answers = await db.studentAnswer.findMany({ where: { attemptId } });
  const byQ = new Map(answers.map((a) => [a.questionId, a]));

  let score = 0;
  let maxScore = 0;
  let pendingReview = false;
  let correctCount = 0;

  for (const eq of exam.questions) {
    maxScore += eq.points;
    const ans = byQ.get(eq.questionId);
    const result = gradeAnswer(eq.question, ans?.answer);
    if (result === null) pendingReview = true; // нээлттэй бодлого — багш шалгана, AI-д бүрэн оноо өгөхгүй
    if (result === true) {
      score += eq.points;
      correctCount++;
    }
    await db.studentAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: eq.questionId } },
      create: {
        attemptId,
        questionId: eq.questionId,
        answer: null,
        isCorrect: result,
        pointsAwarded: result === null ? null : result ? eq.points : 0,
        gradedBy: result === null ? null : "AUTO",
      },
      update: { isCorrect: result, pointsAwarded: result === null ? null : result ? eq.points : 0, gradedBy: result === null ? null : "AUTO" },
    });
    if (result !== null) {
      await db.question.update({
        where: { id: eq.questionId },
        data: { timesAnswered: { increment: 1 }, timesCorrect: { increment: result ? 1 : 0 } },
      });
    }
  }

  const percentage = maxScore ? Math.round((score / maxScore) * 1000) / 10 : 0;
  // Зэрэгцээ илгээлтээс хамгаалах: зөвхөн IN_PROGRESS төлөвтэйг шинэчилнэ
  const updated = await db.examinationAttempt.updateMany({
    where: { id: attemptId, status: "IN_PROGRESS" },
    data: {
      status: auto ? "AUTO_SUBMITTED" : "SUBMITTED",
      submittedAt: new Date(),
      score,
      maxScore,
      percentage,
      pendingReview,
    },
  });
  if (updated.count > 0) {
    const passed = percentage >= exam.passingScore;
    await recordActivity(userId, {
      problems: exam.questions.length,
      correct: correctCount,
      minutes: Math.round((Date.now() - attempt.startedAt.getTime()) / 60000),
      xp: XP_RULES.EXAM_SUBMIT + (passed ? XP_RULES.EXAM_PASS_BONUS : 0),
    });
  }
  return db.examinationAttempt.findUniqueOrThrow({ where: { id: attemptId } });
}

/** Багш нээлттэй бодлогод оноо өгсний дараа нийт оноог дахин тооцоолох */
export async function recomputeAttempt(attemptId: string) {
  const attempt = await db.examinationAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { answers: true, exam: { include: { questions: true } } },
  });
  const maxScore = attempt.exam.questions.reduce((s, q) => s + q.points, 0);
  const score = attempt.answers.reduce((s, a) => s + (a.pointsAwarded ?? 0), 0);
  const pendingReview = attempt.answers.some((a) => a.pointsAwarded === null && a.isCorrect === null);
  return db.examinationAttempt.update({
    where: { id: attemptId },
    data: { score, maxScore, percentage: maxScore ? Math.round((score / maxScore) * 1000) / 10 : 0, pendingReview },
  });
}

/** Үр дүнгийн дэлгэрэнгүй: сэдэв, хүндрэлийн түвшнээр */
export async function attemptResult(attemptId: string, userId: string, isStaff = false) {
  const attempt = await db.examinationAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      user: { select: { name: true } },
      answers: {
        include: {
          question: {
            include: { options: { orderBy: { order: "asc" } }, solutions: true, topic: { select: { title: true, slug: true } } },
          },
        },
      },
    },
  });
  if (!attempt || (!isStaff && attempt.userId !== userId)) throw new HttpError(404, "Үр дүн олдсонгүй.");
  if (attempt.status === "IN_PROGRESS") throw new HttpError(409, "Шалгалт дуусаагүй байна.");

  const order = parseJson<string[]>(attempt.questionOrder, []);
  const answers = [...attempt.answers].sort((a, b) => order.indexOf(a.questionId) - order.indexOf(b.questionId));
  const byTopic = new Map<string, { title: string; slug: string | null; total: number; correct: number }>();
  const byDiff = new Map<number, { total: number; correct: number }>();
  for (const a of answers) {
    const t = a.question.topic;
    const key = t?.title ?? "Бусад";
    const bt = byTopic.get(key) ?? { title: key, slug: t?.slug ?? null, total: 0, correct: 0 };
    bt.total++;
    if (a.isCorrect) bt.correct++;
    byTopic.set(key, bt);
    const bd = byDiff.get(a.question.difficulty) ?? { total: 0, correct: 0 };
    bd.total++;
    if (a.isCorrect) bd.correct++;
    byDiff.set(a.question.difficulty, bd);
  }
  const correct = answers.filter((a) => a.isCorrect === true).length;
  const unanswered = answers.filter((a) => !a.answer || a.answer.trim() === "").length;
  const incorrect = answers.filter((a) => a.isCorrect === false && a.answer && a.answer.trim() !== "").length;
  return {
    attempt,
    answers,
    summary: {
      correct,
      incorrect,
      unanswered,
      pending: answers.filter((a) => a.isCorrect === null).length,
      timeSpentSec: Math.round(((attempt.submittedAt ?? new Date()).getTime() - attempt.startedAt.getTime()) / 1000),
      passed: (attempt.percentage ?? 0) >= attempt.exam.passingScore,
    },
    byTopic: [...byTopic.values()],
    byDifficulty: [...byDiff.entries()].sort((a, b) => a[0] - b[0]).map(([d, v]) => ({ difficulty: d, ...v })),
  };
}
