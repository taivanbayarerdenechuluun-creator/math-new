import type { ExplainMode } from "@/lib/constants";

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorOptions {
  mode: ExplainMode;
  grade: number | null;
  guided: boolean;
}

export interface AiSolveOptions {
  grade: number | null;
  mode: ExplainMode;
}

export interface AiStructuredSolution {
  topic: string;
  problem: string;
  given: string[];
  find: string;
  formulas: { name: string; latex: string }[];
  methodReason: string;
  steps: { title: string; latex: string; explanation: string }[];
  finalAnswer: string;
  finalAnswerLatex: string;
  numericAnswers: number[];
  check: { method: string; steps: string[] };
  alternatives: { title: string; steps: { title: string; latex: string; explanation: string }[] }[];
}

export interface RecognizedQuestion {
  number: string | null;
  text: string; // $LaTeX$ агуулсан бүтэн нөхцөл
  latex: string | null; // гол илэрхийлэл (тэгшитгэл гэх мэт)
  options: { label: string; text: string }[];
  confidence: number; // 0..1
}

export interface OcrResult {
  provider: "MATHPIX" | "CLAUDE_VISION";
  rawText: string;
  questions: RecognizedQuestion[];
  confidence: number;
}

export interface StructuredQuestionDraft {
  text: string;
  type: "MULTIPLE_CHOICE" | "NUMERIC" | "EXPRESSION" | "OPEN";
  options: { label: string; text: string }[];
  suggestedAnswer: string | null;
  suggestedSolution: string | null;
  grade: number | null;
  topicHint: string | null;
  difficulty: number;
}

export class AiNotConfiguredError extends Error {
  constructor(what = "AI") {
    super(`${what} үйлчилгээ тохируулагдаагүй байна. Админ .env файлд API түлхүүрийг оруулах шаардлагатай.`);
  }
}
