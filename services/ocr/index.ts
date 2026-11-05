// Математикийн OCR: Mathpix (тохируулсан бол) → Claude vision (fallback).
// Аль нь ч тохируулаагүй бол тодорхой алдаа буцаана — хэзээ ч "ажиллаж байгаа" мэт дүр эсгэхгүй.
import "server-only";
import { aiRecognizeImage, isAiConfigured } from "@/services/ai/anthropic";
import { AiNotConfiguredError, type OcrResult, type RecognizedQuestion } from "@/services/ai/types";

type ImageMime = "image/jpeg" | "image/png" | "image/webp";

export function ocrStatus() {
  return {
    mathpix: Boolean(process.env.MATHPIX_APP_ID && process.env.MATHPIX_APP_KEY),
    vision: isAiConfigured(),
  };
}

/** Mathpix-ийн текстийг дугаарлалтаар нь бодлогууд болгон салгах */
export function segmentQuestions(text: string, baseConfidence: number): RecognizedQuestion[] {
  const lines = text.split(/\n/);
  const blocks: { number: string | null; lines: string[] }[] = [];
  const numRe = /^\s*(?:\\section\*?\{)?\s*(\d{1,3})\s*[.)]\s*/;
  for (const line of lines) {
    const m = line.match(numRe);
    if (m) blocks.push({ number: m[1], lines: [line.replace(numRe, "")] });
    else if (blocks.length) blocks[blocks.length - 1].lines.push(line);
    else blocks.push({ number: null, lines: [line] });
  }
  return blocks
    .map((b) => {
      const body = b.lines.join("\n").trim();
      const options: { label: string; text: string }[] = [];
      // A) ... B) ... эсвэл (A) ... хэлбэрийн хувилбарууд
      const optRe = /\(?([A-E])[).]\s*([^\n]*?)(?=\s+\(?[A-E][).]\s|$)/g;
      const optLine = body.split("\n").filter((l) => /^\s*\(?A[).]/.test(l));
      let stem = body;
      if (optLine.length) {
        const idx = body.indexOf(optLine[0]);
        const tail = body.slice(idx);
        stem = body.slice(0, idx).trim();
        let m: RegExpExecArray | null;
        while ((m = optRe.exec(tail.replace(/\n/g, " "))) !== null) options.push({ label: m[1], text: m[2].trim() });
      }
      const latexMatch = stem.match(/\\\((.+?)\\\)|\$(.+?)\$/);
      return {
        number: b.number,
        text: stem.replace(/\\\(/g, "$").replace(/\\\)/g, "$"),
        latex: latexMatch ? (latexMatch[1] ?? latexMatch[2]) : null,
        options,
        confidence: baseConfidence,
      };
    })
    .filter((q) => q.text.length > 0);
}

async function mathpix(base64: string, mime: ImageMime): Promise<OcrResult> {
  const res = await fetch("https://api.mathpix.com/v3/text", {
    method: "POST",
    headers: {
      app_id: process.env.MATHPIX_APP_ID!,
      app_key: process.env.MATHPIX_APP_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      src: `data:${mime};base64,${base64}`,
      formats: ["text"],
      math_inline_delimiters: ["$", "$"],
      rm_spaces: true,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Mathpix алдаа: ${res.status}`);
  const data = (await res.json()) as { text?: string; confidence?: number; error?: string };
  if (data.error) throw new Error(`Mathpix: ${data.error}`);
  const text = data.text ?? "";
  const conf = typeof data.confidence === "number" ? data.confidence : 0.8;
  return { provider: "MATHPIX", rawText: text, questions: segmentQuestions(text, conf), confidence: conf };
}

export async function recognizeMath(base64: string, mime: ImageMime): Promise<OcrResult> {
  const status = ocrStatus();
  if (status.mathpix) {
    try {
      return await mathpix(base64, mime);
    } catch (e) {
      console.error("[ocr] Mathpix failed, falling back to vision", e);
      if (!status.vision) throw e;
    }
  }
  if (status.vision) return aiRecognizeImage(base64, mime);
  throw new AiNotConfiguredError("Математик OCR (Mathpix эсвэл Claude)");
}
