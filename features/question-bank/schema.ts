import { z } from "zod";
import { QUESTION_TYPES } from "@/lib/constants";

export const optionSchema = z.object({
  label: z.string().regex(/^[A-E]$/, "Хувилбарын тэмдэглэгээ A–E байна"),
  text: z.string().trim().min(1, "Хувилбарын текст хоосон байна").max(1000),
  isCorrect: z.boolean().default(false),
});

export const stepSchema = z.object({
  title: z.string().max(300).default(""),
  latex: z.string().max(2000).optional().default(""),
  explanation: z.string().max(4000).default(""),
});

export const questionInputSchema = z
  .object({
    gradeId: z.coerce.number().int().min(6).max(12),
    topicId: z.string().nullable().optional(),
    subtopicId: z.string().nullable().optional(),
    type: z.enum(QUESTION_TYPES),
    difficulty: z.coerce.number().int().min(1).max(5).default(2),
    title: z.string().trim().max(200).nullable().optional(),
    text: z.string().trim().min(3, "Бодлогын нөхцөл хэт богино байна").max(10000),
    correctAnswer: z.string().trim().max(1000).nullable().optional(),
    tolerance: z.coerce.number().min(0).nullable().optional(),
    explanation: z.string().max(10000).nullable().optional(),
    relatedFormulas: z.array(z.string().max(500)).max(20).default([]),
    tags: z.array(z.string().trim().max(40)).max(20).default([]),
    sourceName: z.string().trim().max(200).nullable().optional(),
    options: z.array(optionSchema).max(5).default([]),
    solutionSteps: z.array(stepSchema).max(30).default([]),
    solutionMethod: z.string().max(200).nullable().optional(),
    originalFileId: z.string().nullable().optional(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "MULTIPLE_CHOICE") {
      if (q.options.length < 2) ctx.addIssue({ code: "custom", path: ["options"], message: "Хамгийн багадаа 2 хувилбар оруулна уу." });
      const labels = new Set(q.options.map((o) => o.label));
      if (labels.size !== q.options.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Хувилбарын тэмдэглэгээ давхардсан байна." });
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

/** Баталгаажуулах (VERIFIED) боломжтой эсэхийг шалгах — бүрэн бөгөөд зөв хариутай байх ёстой */
export function verificationProblems(q: {
  type: string;
  correctAnswer: string | null;
  options: { isCorrect: boolean }[];
}): string[] {
  const issues: string[] = [];
  if (q.type === "MULTIPLE_CHOICE") {
    const n = q.options.filter((o) => o.isCorrect).length;
    if (n !== 1) issues.push("Сонгох хариулттай бодлогод яг нэг зөв хувилбар байх ёстой.");
  } else if (q.type !== "OPEN" && !q.correctAnswer?.trim()) {
    issues.push("Зөв хариулт оруулаагүй байна.");
  }
  return issues;
}

/** Төлөвийн шилжилтийн дүрэм */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["NEEDS_REVIEW", "REJECTED"],
  PROCESSING: ["NEEDS_REVIEW", "DRAFT"],
  NEEDS_REVIEW: ["VERIFIED", "REJECTED", "DRAFT"],
  VERIFIED: ["PUBLISHED", "NEEDS_REVIEW", "REJECTED"],
  PUBLISHED: ["VERIFIED"],
  REJECTED: ["DRAFT", "NEEDS_REVIEW"],
};
