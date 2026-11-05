// OCR-оор танигдсан бодлогуудаас сонгосныг санд оруулах. Бүгд NEEDS_REVIEW төлөвтэй үүснэ —
// анхны OCR текст (originalText), эх файл (originalFileId), итгэлийн түвшин тусдаа хадгалагдана.
import { z } from "zod";
import { db } from "@/lib/db";
import { canManageGrade, HttpError, requireApiRole, STAFF } from "@/lib/auth";
import { audit, ok, rateLimit, route } from "@/lib/api";
import { contentHash, createQuestion } from "@/features/question-bank/server";
import { aiStructureQuestion, isAiConfigured } from "@/services/ai/anthropic";

export const maxDuration = 300;

const schema = z.object({
  kind: z.enum(["IMAGE", "PDF"]),
  fileName: z.string().max(200).default("scan"),
  gradeId: z.coerce.number().int().min(6).max(12),
  topicId: z.string().nullable().optional(),
  sourceName: z.string().max(200).nullable().optional(),
  structureWithAi: z.boolean().default(false),
  items: z
    .array(
      z.object({
        text: z.string().trim().min(3).max(10000),
        rawText: z.string().max(20000).nullable().optional(),
        options: z.array(z.object({ label: z.string(), text: z.string() })).max(5).default([]),
        fileId: z.string().nullable().optional(),
        confidence: z.number().min(0).max(1).nullable().optional(),
      }),
    )
    .min(1, "Импортлох бодлого сонгоно уу.")
    .max(100),
});

export const POST = route(async (req) => {
  const user = await requireApiRole(STAFF);
  rateLimit(`ocrcommit:${user.id}`, 30, 60 * 60_000);
  const body = schema.parse(await req.json());
  if (!(await canManageGrade(user, body.gradeId))) throw new HttpError(403, "Энэ ангид импортлох эрхгүй.");
  const useAi = body.structureWithAi && isAiConfigured();

  // Файлууд тухайн хэрэглэгчийнх эсэхийг шалгах
  const fileIds = [...new Set(body.items.map((i) => i.fileId).filter(Boolean))] as string[];
  const files = await db.uploadedFile.findMany({ where: { id: { in: fileIds } } });
  if (files.some((f) => f.userId !== user.id)) throw new HttpError(403, "Файлд хандах эрхгүй.");

  const job = await db.questionImportJob.create({
    data: { userId: user.id, type: body.kind, fileName: body.fileName, status: "PROCESSING", total: body.items.length },
  });
  const errors: { row: number; message: string }[] = [];
  let succeeded = 0;

  for (const [i, item] of body.items.entries()) {
    try {
      if (await db.question.findFirst({ where: { contentHash: contentHash(item.text) }, select: { id: true } })) {
        throw new Error("Бодлогын санд ижил бодлого аль хэдийн байна.");
      }
      let type: "MULTIPLE_CHOICE" | "NUMERIC" | "EXPRESSION" | "OPEN" = item.options.length >= 2 ? "MULTIPLE_CHOICE" : "OPEN";
      let options = item.options.slice(0, 5).map((o, k) => ({ label: "ABCDE"[k], text: o.text || "—", isCorrect: false }));
      let correctAnswer: string | null = null;
      let explanation: string | null = null;
      let difficulty = 2;
      if (useAi) {
        try {
          const s = await aiStructureQuestion(item.text + (item.options.length ? "\n" + item.options.map((o) => `${o.label}) ${o.text}`).join("\n") : ""));
          type = s.type;
          difficulty = Math.min(5, Math.max(1, Math.round(s.difficulty) || 2));
          if (s.type === "MULTIPLE_CHOICE" && s.options.length >= 2) {
            options = s.options.slice(0, 5).map((o, k) => ({ label: "ABCDE"[k], text: o.text, isCorrect: (s.suggestedAnswer ?? "").toUpperCase() === o.label.toUpperCase() }));
          } else if (s.type !== "MULTIPLE_CHOICE") {
            options = [];
            correctAnswer = s.suggestedAnswer;
          }
          explanation = s.suggestedSolution;
        } catch (e) {
          console.error("[ocr-commit] AI structuring failed", e);
        }
      }
      await createQuestion(
        {
          gradeId: body.gradeId,
          topicId: body.topicId || null,
          type,
          difficulty,
          text: item.text,
          correctAnswer,
          explanation,
          relatedFormulas: [],
          tags: [],
          sourceName: body.sourceName || null,
          options: type === "MULTIPLE_CHOICE" ? options : [],
          solutionSteps: [],
          originalFileId: item.fileId || null,
        },
        user,
        { status: "NEEDS_REVIEW", originalText: item.rawText ?? item.text, ocrConfidence: item.confidence ?? null, importJobId: job.id, aiGenerated: useAi },
      );
      succeeded++;
    } catch (e) {
      errors.push({ row: i + 1, message: (e as Error).message });
    }
  }

  const failed = body.items.length - succeeded;
  await db.questionImportJob.update({
    where: { id: job.id },
    data: { succeeded, failed, errors: JSON.stringify(errors), status: succeeded === 0 ? "FAILED" : failed ? "PARTIAL" : "COMPLETED" },
  });
  await audit(user.id, "IMPORT", "question_import_job", job.id, { kind: body.kind, succeeded, failed });
  return ok({ jobId: job.id, succeeded, failed, errors });
});
