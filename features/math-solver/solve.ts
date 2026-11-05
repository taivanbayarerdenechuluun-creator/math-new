// Бодогчийн зохицуулагч: эхлээд symbolic хөдөлгүүр, боломжгүй бол AI, дараа нь AI-ийн хариуг
// symbolic хөдөлгүүрээр бие даан шалгана. AI-ийн хариуг шалгалгүйгээр "зөв" гэж хэзээ ч тэмдэглэхгүй.
import "server-only";
import type { SolutionResult } from "@/types/math";
import { compareNumericSets, solveSymbolic } from "@/services/mathematics/solver";
import { aiSolve, isAiConfigured } from "@/services/ai/anthropic";
import { AiNotConfiguredError } from "@/services/ai/types";
import type { ExplainMode } from "@/lib/constants";
import { extractPureMath } from "@/services/mathematics/extract";

type ImageMime = "image/jpeg" | "image/png" | "image/webp";

/** AI-ийн LaTeX-ээс symbolic хөдөлгүүрийн ойлгох тэгшитгэлийг гаргаж авах оролдлого */
function extractMath(s: string): string | null {
  const m = s.match(/\$\$(.+?)\$\$|\$(.+?)\$/s);
  const candidate = (m ? (m[1] ?? m[2]) : s).trim();
  return candidate.length > 0 && candidate.length < 300 ? candidate : null;
}

export async function solveProblem(
  input: string,
  opts: { grade: number | null; mode: ExplainMode; forceAi?: boolean },
  image?: { base64: string; mime: ImageMime },
): Promise<SolutionResult> {
  if (!opts.forceAi) {
    const symbolic = solveSymbolic(input);
    if (symbolic) return symbolic;
    const pure = extractPureMath(input);
    const fromText = pure ? solveSymbolic(pure) : null;
    if (fromText) return { ...fromText, problem: input };
  }

  if (!isAiConfigured()) {
    throw new AiNotConfiguredError(
      "Энэ төрлийн бодлогыг (текст бодлого, геометр г.м.) бодоход AI шаардлагатай. AI",
    );
  }

  const ai = await aiSolve(input, opts, image);
  let verification: SolutionResult["verification"] = "UNVERIFIED";
  let verificationNote =
    "AI-ийн бодолт. Энэ хариуг тооцооллын хөдөлгүүрээр бие даан шалгах боломжгүй байсан тул багш эсвэл сурах бичгээрээ нягтална уу.";
  let engine: SolutionResult["engine"] = "AI";

  // Бие даасан шалгалт: сурагчийн оролт эсвэл AI-ийн томьёолсон бодлогыг symbolic-ээр бодож харьцуулна
  const candidates = [input, extractMath(ai.problem)].filter((x): x is string => Boolean(x));
  for (const c of candidates) {
    const check = solveSymbolic(c);
    if (check?.numeric && check.numeric.length > 0 && ai.numericAnswers.length > 0) {
      engine = "AI+SYMBOLIC";
      if (compareNumericSets(check.numeric, ai.numericAnswers, 1e-4)) {
        verification = "VERIFIED";
        verificationNote = "AI-ийн хариуг тооцооллын хөдөлгүүрээр бие даан шалгаж, зөв болохыг баталгаажуулсан.";
      } else {
        verification = "MISMATCH";
        verificationNote = `Анхаар: AI-ийн хариу (${ai.numericAnswers.join("; ")}) тооцооллын хөдөлгүүрийн хариутай (${check.finalAnswer}) зөрж байна. Тооцооллын хөдөлгүүрийн хариу илүү найдвартай.`;
      }
      break;
    }
  }

  return {
    problem: ai.problem,
    kind: "AI",
    topic: ai.topic,
    given: ai.given,
    find: ai.find,
    formulas: ai.formulas,
    methodReason: ai.methodReason,
    steps: ai.steps,
    finalAnswer: ai.finalAnswer,
    finalAnswerLatex: ai.finalAnswerLatex,
    check: { method: ai.check.method, steps: ai.check.steps, passed: verification === "VERIFIED" ? true : verification === "MISMATCH" ? false : null },
    alternatives: ai.alternatives.length ? ai.alternatives : undefined,
    engine,
    verification,
    verificationNote,
    numeric: ai.numericAnswers,
  };
}
