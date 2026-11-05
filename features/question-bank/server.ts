import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { HttpError, canManageGrade, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { STATUS_TRANSITIONS, verificationProblems, type QuestionInput } from "./schema";

export function contentHash(text: string) {
  const norm = text.toLowerCase().replace(/\s+/g, "").replace(/[$\\{}]/g, "");
  return crypto.createHash("sha1").update(norm).digest("hex");
}

export async function nextQuestionCode(): Promise<string> {
  const last = await db.question.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
  const n = last ? Number(last.code.replace(/\D/g, "")) + 1 : 1;
  return `IQM-${String(n).padStart(6, "0")}`;
}

async function sourceIdFor(name: string | null | undefined) {
  if (!name?.trim()) return null;
  const s = await db.questionSource.upsert({ where: { name: name.trim() }, create: { name: name.trim() }, update: {} });
  return s.id;
}

function normalizeMcAnswer(input: QuestionInput) {
  if (input.type !== "MULTIPLE_CHOICE") return input.correctAnswer ?? null;
  return input.options.find((o) => o.isCorrect)?.label ?? null;
}

export async function createQuestion(
  input: QuestionInput,
  user: CurrentUser,
  extra: { status?: string; originalText?: string | null; ocrConfidence?: number | null; importJobId?: string | null; aiGenerated?: boolean } = {},
) {
  if (!(await canManageGrade(user, input.gradeId))) throw new HttpError(403, "Танд энэ ангийн контентыг засах эрх байхгүй.");
  const code = await nextQuestionCode();
  const q = await db.question.create({
    data: {
      code,
      gradeId: input.gradeId,
      topicId: input.topicId || null,
      subtopicId: input.subtopicId || null,
      type: input.type,
      difficulty: input.difficulty,
      title: input.title || null,
      text: input.text,
      correctAnswer: normalizeMcAnswer(input),
      tolerance: input.tolerance ?? null,
      explanation: input.explanation || null,
      relatedFormulas: JSON.stringify(input.relatedFormulas),
      tags: input.tags.join(","),
      status: extra.status ?? "DRAFT",
      sourceId: await sourceIdFor(input.sourceName),
      originalText: extra.originalText ?? null,
      ocrConfidence: extra.ocrConfidence ?? null,
      originalFileId: input.originalFileId || null,
      importJobId: extra.importJobId ?? null,
      aiGenerated: extra.aiGenerated ?? false,
      contentHash: contentHash(input.text),
      authorId: user.id,
      options: {
        create: input.options.map((o, i) => ({ label: o.label, text: o.text, isCorrect: o.isCorrect, order: i })),
      },
      solutions: input.solutionSteps.length
        ? {
            create: {
              method: input.solutionMethod || null,
              steps: JSON.stringify(input.solutionSteps),
              finalAnswer: normalizeMcAnswer(input),
              isAiGenerated: extra.aiGenerated ?? false,
            },
          }
        : undefined,
    },
  });
  await audit(user.id, "CREATE", "question", q.id, { code, status: q.status });
  return q;
}

export async function updateQuestion(id: string, input: QuestionInput, user: CurrentUser) {
  const existing = await db.question.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Бодлого олдсонгүй.");
  if (!(await canManageGrade(user, existing.gradeId)) || !(await canManageGrade(user, input.gradeId)))
    throw new HttpError(403, "Танд энэ ангийн контентыг засах эрх байхгүй.");

  // Баталгаажсан/нийтлэгдсэн бодлогын агуулга өөрчлөгдвөл дахин хянуулна
  const contentChanged =
    existing.text !== input.text || existing.correctAnswer !== normalizeMcAnswer(input) || existing.type !== input.type;
  let status = existing.status;
  if (contentChanged && (existing.status === "VERIFIED" || existing.status === "PUBLISHED")) status = "NEEDS_REVIEW";

  await db.$transaction([
    db.questionOption.deleteMany({ where: { questionId: id } }),
    db.solution.deleteMany({ where: { questionId: id, isAiGenerated: false } }),
    db.question.update({
      where: { id },
      data: {
        gradeId: input.gradeId,
        topicId: input.topicId || null,
        subtopicId: input.subtopicId || null,
        type: input.type,
        difficulty: input.difficulty,
        title: input.title || null,
        text: input.text,
        correctAnswer: normalizeMcAnswer(input),
        tolerance: input.tolerance ?? null,
        explanation: input.explanation || null,
        relatedFormulas: JSON.stringify(input.relatedFormulas),
        tags: input.tags.join(","),
        contentHash: contentHash(input.text),
        status,
        publishedAt: status === "PUBLISHED" ? existing.publishedAt : null,
        options: { create: input.options.map((o, i) => ({ label: o.label, text: o.text, isCorrect: o.isCorrect, order: i })) },
        solutions: input.solutionSteps.length
          ? { create: { method: input.solutionMethod || null, steps: JSON.stringify(input.solutionSteps), finalAnswer: normalizeMcAnswer(input) } }
          : undefined,
      },
    }),
  ]);
  // Лавлах зураг: OCR-ийн эх файлыг (QUESTION_IMPORT) хэзээ ч дарж бичихгүй
  const currentFile = existing.originalFileId ? await db.uploadedFile.findUnique({ where: { id: existing.originalFileId } }) : null;
  if (currentFile?.purpose !== "QUESTION_IMPORT") {
    await db.question.update({ where: { id }, data: { originalFileId: input.originalFileId || null } });
  }
  if (input.sourceName !== undefined) {
    await db.question.update({ where: { id }, data: { sourceId: await sourceIdFor(input.sourceName) } });
  }
  await audit(user.id, "UPDATE", "question", id, { statusReset: status !== existing.status });
  return db.question.findUniqueOrThrow({ where: { id } });
}

/** Төлөв өөрчлөх (хянах, баталгаажуулах, нийтлэх, татгалзах) */
export async function changeQuestionStatus(id: string, to: string, user: CurrentUser, comment?: string) {
  const q = await db.question.findUnique({ where: { id }, include: { options: true } });
  if (!q) throw new HttpError(404, "Бодлого олдсонгүй.");
  if (!(await canManageGrade(user, q.gradeId))) throw new HttpError(403, "Танд энэ ангийн контентыг хянах эрх байхгүй.");
  if (!STATUS_TRANSITIONS[q.status]?.includes(to)) throw new HttpError(400, `"${q.status}" төлвөөс "${to}" руу шилжих боломжгүй.`);

  if (to === "VERIFIED") {
    const problems = verificationProblems(q);
    if (problems.length) throw new HttpError(400, problems.join(" "));
    // Багш өөрийн оруулсан бодлогыг өөрөө баталгаажуулахгүй (хоёр хүний хяналт). Админ үл хамаарна.
    if (user.role !== "ADMIN" && q.authorId === user.id)
      throw new HttpError(403, "Өөрийн үүсгэсэн бодлогыг өөр багш эсвэл админ баталгаажуулах ёстой.");
  }
  if (to === "PUBLISHED" && q.status !== "VERIFIED") throw new HttpError(400, "Зөвхөн баталгаажсан бодлогыг нийтэлнэ.");

  const action = { VERIFIED: "APPROVE", REJECTED: "REJECT", PUBLISHED: "PUBLISH", NEEDS_REVIEW: "SUBMIT", DRAFT: "EDIT" }[to] ?? "EDIT";
  const updated = await db.question.update({
    where: { id },
    data: {
      status: to,
      ...(to === "VERIFIED" ? { reviewerId: user.id, reviewedAt: new Date() } : {}),
      ...(to === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      ...(q.status === "PUBLISHED" ? { publishedAt: null } : {}),
    },
  });
  if (to === "VERIFIED") await db.solution.updateMany({ where: { questionId: id }, data: { isVerified: true } });
  await db.questionReview.create({ data: { questionId: id, reviewerId: user.id, action: q.status === "PUBLISHED" ? "UNPUBLISH" : action, comment: comment || null } });
  await audit(user.id, "STATUS", "question", id, { from: q.status, to });
  return updated;
}
