import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/auth";

export const examSchema = z.object({
  title: z.string().trim().min(3, "Нэр хэт богино").max(160),
  description: z.string().max(1000).nullable().optional(),
  gradeId: z.coerce.number().int().min(6).max(12),
  durationMinutes: z.coerce.number().int().min(1).max(300),
  passingScore: z.coerce.number().int().min(0).max(100),
  randomize: z.boolean().default(true),
  showSolutions: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  availableFrom: z.string().nullable().optional(),
  availableTo: z.string().nullable().optional(),
  questions: z.array(z.object({ questionId: z.string(), points: z.coerce.number().int().min(1).max(100).default(1) })).min(1, "Хамгийн багадаа 1 асуулт сонгоно уу.").max(200),
});

/** Зөвхөн НИЙТЛЭГДСЭН (баталгаажсан) бодлогыг шалгалтад оруулна */
export async function validateExamQuestions(ids: string[]) {
  const qs = await db.question.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, code: true } });
  const bad = qs.filter((q) => q.status !== "PUBLISHED");
  if (qs.length !== new Set(ids).size) throw new HttpError(400, "Зарим асуулт олдсонгүй.");
  if (bad.length) throw new HttpError(400, `Нийтлэгдээгүй бодлогыг шалгалтад оруулах боломжгүй: ${bad.map((b) => b.code).join(", ")}`);
}

export const toDate = (s: string | null | undefined) => (s ? new Date(s) : null);

