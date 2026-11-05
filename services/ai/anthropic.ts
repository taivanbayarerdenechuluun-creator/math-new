// Claude (Anthropic) provider — бүх дуудлага зөвхөн сервер талд. API түлхүүр frontend-д хэзээ ч хүрэхгүй.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import {
  AiNotConfiguredError,
  type AiSolveOptions,
  type AiStructuredSolution,
  type OcrResult,
  type StructuredQuestionDraft,
  type TutorMessage,
  type TutorOptions,
} from "./types";
import { OCR_SYSTEM_PROMPT, STRUCTURE_SYSTEM_PROMPT, solveSystemPrompt, tutorSystemPrompt } from "./prompts";

const MODEL = process.env.AI_MODEL || "claude-opus-5-5";
// Аюулгүй байдлын шүүлтүүр хүсэлтийг татгалзвал сервер талд санал болгосон загвар руу автоматаар шилжинэ.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiNotConfiguredError("AI (Claude)");
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 120_000, maxRetries: 2 });
  return client;
}

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export class AiRefusalError extends Error {
  constructor() {
    super("AI энэ хүсэлтэд хариулах боломжгүй байна. Асуултаа өөрөөр томьёолж үзнэ үү.");
  }
}

// ── Бүтэцтэй гаралтын схемүүд ──
const StepSchema = z.object({ title: z.string(), latex: z.string(), explanation: z.string() });
const SolutionSchema = z.object({
  topic: z.string(),
  problem: z.string(),
  given: z.array(z.string()),
  find: z.string(),
  formulas: z.array(z.object({ name: z.string(), latex: z.string() })),
  methodReason: z.string(),
  steps: z.array(StepSchema),
  finalAnswer: z.string(),
  finalAnswerLatex: z.string(),
  numericAnswers: z.array(z.number()),
  check: z.object({ method: z.string(), steps: z.array(z.string()) }),
  alternatives: z.array(z.object({ title: z.string(), steps: z.array(StepSchema) })),
});

const OcrSchema = z.object({
  rawText: z.string(),
  questions: z.array(
    z.object({
      number: z.string().nullable(),
      text: z.string(),
      latex: z.string().nullable(),
      options: z.array(z.object({ label: z.string(), text: z.string() })),
      confidence: z.number(),
    }),
  ),
});

const StructureSchema = z.object({
  text: z.string(),
  type: z.enum(["MULTIPLE_CHOICE", "NUMERIC", "EXPRESSION", "OPEN"]),
  options: z.array(z.object({ label: z.string(), text: z.string() })),
  suggestedAnswer: z.string().nullable(),
  suggestedSolution: z.string().nullable(),
  grade: z.number().nullable(),
  topicHint: z.string().nullable(),
  difficulty: z.number(),
});

type ImageMime = "image/jpeg" | "image/png" | "image/webp";

export async function aiSolve(problem: string, opts: AiSolveOptions, image?: { base64: string; mime: ImageMime }) {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mime, data: image.base64 } });
  content.push({ type: "text", text: `Бодлого:\n${problem}` });

  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "high", format: betaZodOutputFormat(SolutionSchema) },
    system: solveSystemPrompt(opts.mode, opts.grade),
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") throw new AiRefusalError();
  if (!res.parsed_output) throw new Error("AI-ийн хариуг задлах боломжгүй байлаа.");
  return res.parsed_output as AiStructuredSolution;
}

/** AI багшийн хариуг текст хэсгүүдээр урсгана (streaming) */
export async function* aiTutorStream(history: TutorMessage[], opts: TutorOptions): AsyncGenerator<string> {
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    ...FALLBACK,
    output_config: { effort: "medium" },
    system: tutorSystemPrompt(opts.mode, opts.grade, opts.guided),
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") throw new AiRefusalError();
}

export async function aiRecognizeImage(base64: string, mime: ImageMime): Promise<OcrResult> {
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    ...FALLBACK,
    output_config: { effort: "medium", format: betaZodOutputFormat(OcrSchema) },
    system: OCR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data: base64 } },
          { type: "text", text: "Энэ зураг дээрх бүх математикийн бодлогыг уншиж бүтэцтэй болго." },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new AiRefusalError();
  const out = res.parsed_output;
  if (!out) throw new Error("Зургийг уншиж чадсангүй.");
  const qs = out.questions.map((q) => ({ ...q, confidence: Math.max(0, Math.min(1, q.confidence)) }));
  return {
    provider: "CLAUDE_VISION",
    rawText: out.rawText,
    questions: qs,
    confidence: qs.length ? qs.reduce((s, q) => s + q.confidence, 0) / qs.length : 0,
  };
}

export async function aiStructureQuestion(text: string): Promise<StructuredQuestionDraft> {
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    ...FALLBACK,
    output_config: { effort: "medium", format: betaZodOutputFormat(StructureSchema) },
    system: STRUCTURE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  });
  if (res.stop_reason === "refusal") throw new AiRefusalError();
  if (!res.parsed_output) throw new Error("Бүтэцжүүлж чадсангүй.");
  return res.parsed_output as StructuredQuestionDraft;
}

/** Алдааг хэрэглэгчид ойлгомжтой мессеж болгох */
export function describeAiError(err: unknown): { status: number; message: string } {
  if (err instanceof AiNotConfiguredError) return { status: 503, message: err.message };
  if (err instanceof AiRefusalError) return { status: 422, message: err.message };
  if (err instanceof Anthropic.RateLimitError) return { status: 429, message: "AI үйлчилгээ түр ачаалалтай байна. Хэсэг хугацааны дараа дахин оролдоно уу." };
  if (err instanceof Anthropic.AuthenticationError) return { status: 503, message: "AI-ийн API түлхүүр буруу байна. Админд хандана уу." };
  if (err instanceof Anthropic.APIConnectionTimeoutError) return { status: 504, message: "AI хариу өгөх хугацаа хэтэрлээ. Дахин оролдоно уу." };
  if (err instanceof Anthropic.APIConnectionError) return { status: 502, message: "AI үйлчилгээтэй холбогдож чадсангүй. Интернэт холболтоо шалгана уу." };
  if (err instanceof Anthropic.APIError) return { status: 502, message: "AI үйлчилгээнд алдаа гарлаа. Дахин оролдоно уу." };
  console.error("[ai]", err);
  return { status: 500, message: "AI боловсруулалтад алдаа гарлаа." };
}
