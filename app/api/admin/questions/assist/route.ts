// Бодлого засварлагчийн туслах: (1) хариуг тооцооллын хөдөлгүүрээр шалгах, (2) AI-аас бүтэц санал авах.
// AI-ийн санал хэзээ ч автоматаар хадгалагдахгүй, баталгаажихгүй — зөвхөн засварлагчид харуулна.
import { z } from "zod";
import { requireApiRole, STAFF } from "@/lib/auth";
import { fail, ok, rateLimit, route } from "@/lib/api";
import { solveSymbolic } from "@/services/mathematics/solver";
import { extractPureMath } from "@/services/mathematics/extract";
import { expressionEquivalent, numericEquivalent } from "@/services/mathematics/equivalence";
import { aiStructureQuestion, describeAiError } from "@/services/ai/anthropic";

const schema = z.object({
  action: z.enum(["check", "suggest"]),
  text: z.string().min(1).max(10000),
  type: z.string().optional(),
  correctAnswer: z.string().max(1000).nullable().optional(),
  tolerance: z.number().nullable().optional(),
});

export const POST = route(async (req) => {
  const user = await requireApiRole(STAFF);
  const body = schema.parse(await req.json());

  if (body.action === "check") {
    const candidate = extractPureMath(body.text) ?? body.text;
    const r = solveSymbolic(candidate);
    if (!r) return ok({ status: "UNSUPPORTED", message: "Энэ бодлогыг тооцооллын хөдөлгүүрээр автоматаар шалгах боломжгүй. Гараар нягтална уу." });
    const engineAnswer = r.numeric?.length ? r.numeric.map((n) => String(Math.round(n * 1e9) / 1e9)).join("; ") : r.finalAnswer;
    if (!body.correctAnswer) return ok({ status: "INFO", engineAnswer, engineLatex: r.finalAnswerLatex, message: "Хөдөлгүүрийн бодсон хариу." });
    const match =
      body.type === "EXPRESSION" ? expressionEquivalent(body.correctAnswer, r.finalAnswer) : numericEquivalent(body.correctAnswer, engineAnswer, body.tolerance ?? 1e-6);
    return ok({
      status: match ? "MATCH" : "MISMATCH",
      engineAnswer,
      engineLatex: r.finalAnswerLatex,
      message: match ? "Оруулсан хариу тооцооллын хөдөлгүүрийн хариутай таарч байна." : "Анхаар: оруулсан хариу тооцооллын хөдөлгүүрийн хариутай таарахгүй байна.",
    });
  }

  rateLimit(`assist:${user.id}`, 60, 60 * 60_000);
  try {
    const suggestion = await aiStructureQuestion(body.text);
    return ok({ suggestion });
  } catch (err) {
    const { status, message } = describeAiError(err);
    return fail(status, message);
  }
});
