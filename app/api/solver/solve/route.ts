import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { fail, ok, rateLimit, route } from "@/lib/api";
import { solveProblem } from "@/features/math-solver/solve";
import { describeAiError } from "@/services/ai/anthropic";
import { readUpload } from "@/services/storage";
import { recordActivity } from "@/features/gamification/server";
import { XP_RULES, type ExplainMode } from "@/lib/constants";

export const maxDuration = 120;

const schema = z.object({
  input: z.string().trim().min(1, "Бодлогоо оруулна уу.").max(4000, "Бодлого хэт урт байна."),
  inputType: z.enum(["TEXT", "IMAGE", "CAMERA", "PDF"]),
  originalText: z.string().max(8000).nullable().optional(),
  imageFileId: z.string().nullable().optional(),
  forceAi: z.boolean().optional(),
  mode: z.enum(["BEGINNER", "STANDARD", "ADVANCED"]).optional(),
});

export const POST = route(async (req) => {
  const user = await requireApiRole();
  const body = schema.parse(await req.json());
  rateLimit(`solve:${user.id}`, 40, 60 * 60_000);

  let image: { base64: string; mime: "image/jpeg" | "image/png" | "image/webp" } | undefined;
  if (body.imageFileId) {
    const file = await db.uploadedFile.findUnique({ where: { id: body.imageFileId } });
    // Зөвхөн өөрийн файлыг ашиглана
    if (!file || file.userId !== user.id) return fail(404, "Зураг олдсонгүй.");
    if (file.mimeType.startsWith("image/")) {
      image = { base64: (await readUpload(file.path)).toString("base64"), mime: file.mimeType as "image/jpeg" | "image/png" | "image/webp" };
    }
  }

  let solution;
  try {
    solution = await solveProblem(body.input, { grade: user.grade, mode: (body.mode ?? user.explainMode) as ExplainMode, forceAi: body.forceAi }, image);
  } catch (err) {
    const { status, message } = describeAiError(err);
    return fail(status, message);
  }

  const saved = await db.solvedProblem.create({
    data: {
      userId: user.id,
      inputType: body.inputType,
      originalText: body.originalText ?? body.input,
      recognizedLatex: body.input,
      imageFileId: image ? body.imageFileId : null,
      solution: JSON.stringify(solution),
      topic: solution.topic,
      engine: solution.engine,
      verification: solution.verification,
    },
  });
  let achievements: { title: string }[] = [];
  if (user.role === "STUDENT") achievements = await recordActivity(user.id, { xp: XP_RULES.SOLVER_USE });
  return ok({ id: saved.id, solution, achievements });
});
