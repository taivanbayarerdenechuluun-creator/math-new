// CSV / XLSX / JSON бөөн импорт: мөр бүрийг шалгаж, давхардлыг илрүүлнэ.
import "server-only";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { questionInputSchema, type QuestionInput } from "@/features/question-bank/schema";
import { contentHash } from "@/features/question-bank/server";

export const TEMPLATE_COLUMNS = [
  "grade",
  "topic",
  "type",
  "difficulty",
  "text",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "optionE",
  "correct",
  "tolerance",
  "explanation",
  "tags",
  "source",
] as const;

export const TEMPLATE_ROWS: Record<string, string | number>[] = [
  {
    grade: 9,
    topic: "g9-quadratic-equations",
    type: "MULTIPLE_CHOICE",
    difficulty: 2,
    text: "$x^2 - 7x + 12 = 0$ тэгшитгэлийн язгууруудын нийлбэр хэд вэ?",
    optionA: "$7$",
    optionB: "$-7$",
    optionC: "$12$",
    optionD: "$3$",
    optionE: "",
    correct: "A",
    tolerance: "",
    explanation: "Виетийн теоремоор $x_1 + x_2 = 7$.",
    tags: "квадрат,виет",
    source: "Миний сан",
  },
  {
    grade: 7,
    topic: "Шугаман тэгшитгэл",
    type: "NUMERIC",
    difficulty: 1,
    text: "Тэгшитгэлийг бод: $4x + 5 = 21$",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    optionE: "",
    correct: "4",
    tolerance: "",
    explanation: "$4x = 16$, $x = 4$.",
    tags: "шугаман",
    source: "Миний сан",
  },
];

export interface RowResult {
  row: number;
  ok: boolean;
  duplicate: boolean;
  errors: string[];
  preview: { text: string; grade: number | null; type: string; correct: string | null; topic: string | null };
  data?: QuestionInput;
}

function parseFile(name: string, buf: Buffer): Record<string, unknown>[] {
  const lower = name.toLowerCase();
  if (lower.endsWith(".json")) {
    const parsed = JSON.parse(buf.toString("utf8"));
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : null;
    if (!arr) throw new Error("JSON файл нь бодлогуудын массив эсвэл { questions: [...] } хэлбэртэй байх ёстой.");
    return arr;
  }
  if (lower.endsWith(".csv")) {
    const text = buf.toString("utf8").replace(/^﻿/, "");
    const res = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    if (res.errors.length && res.data.length === 0) throw new Error(`CSV задлахад алдаа: ${res.errors[0].message}`);
    return res.data;
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  }
  throw new Error("Дэмжигдэхгүй файлын төрөл. CSV, XLSX эсвэл JSON оруулна уу.");
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export async function analyzeBulk(fileName: string, buf: Buffer): Promise<RowResult[]> {
  const rows = parseFile(fileName, buf);
  if (rows.length === 0) throw new Error("Файлд мөр алга.");
  if (rows.length > 2000) throw new Error("Нэг удаад хамгийн ихдээ 2000 мөр импортлоно.");

  const topics = await db.topic.findMany({ select: { id: true, slug: true, title: true, unit: { select: { gradeId: true } } } });
  const seen = new Set<string>();
  const results: RowResult[] = [];

  for (const [i, r] of rows.entries()) {
    const errors: string[] = [];
    const grade = Number(str(r.grade));
    const type = str(r.type).toUpperCase() || "NUMERIC";
    const topicKey = str(r.topic);
    let topicId: string | null = null;
    if (topicKey) {
      const t = topics.find((x) => x.slug === topicKey) ?? topics.find((x) => x.title.toLowerCase() === topicKey.toLowerCase() && x.unit.gradeId === grade);
      if (t) topicId = t.id;
      else errors.push(`Сэдэв олдсонгүй: "${topicKey}"`);
    }
    const correct = str(r.correct);
    const labels = ["A", "B", "C", "D", "E"];
    const options =
      type === "MULTIPLE_CHOICE"
        ? labels
            .map((l) => ({ label: l, text: str(r[`option${l}`]), isCorrect: correct.toUpperCase() === l }))
            .filter((o) => o.text)
        : [];
    if (type === "MULTIPLE_CHOICE" && !options.some((o) => o.isCorrect)) errors.push("Зөв хувилбарыг (A–E) correct баганад заана уу.");
    if ((type === "NUMERIC" || type === "EXPRESSION") && !correct) errors.push("Зөв хариу (correct) хоосон байна.");

    const candidate = {
      gradeId: grade,
      topicId,
      type,
      difficulty: Number(str(r.difficulty)) || 2,
      text: str(r.text),
      correctAnswer: type === "MULTIPLE_CHOICE" ? null : correct || null,
      tolerance: str(r.tolerance) ? Number(str(r.tolerance).replace(",", ".")) : null,
      explanation: str(r.explanation) || null,
      tags: str(r.tags).split(",").map((t) => t.trim()).filter(Boolean),
      sourceName: str(r.source) || null,
      options,
    };
    const parsed = questionInputSchema.safeParse(candidate);
    if (!parsed.success) errors.push(...parsed.error.issues.map((iss) => `${iss.path.join(".") || "мөр"}: ${iss.message}`));

    let duplicate = false;
    if (candidate.text) {
      const h = contentHash(candidate.text);
      if (seen.has(h)) {
        duplicate = true;
        errors.push("Файл дотор давхардсан бодлого.");
      } else if (await db.question.findFirst({ where: { contentHash: h }, select: { id: true } })) {
        duplicate = true;
        errors.push("Бодлогын санд ижил бодлого аль хэдийн байна.");
      }
      seen.add(h);
    }
    results.push({
      row: i + 2, // толгой мөрийг тооцож Excel-ийн мөрийн дугаартай тааруулна
      ok: errors.length === 0,
      duplicate,
      errors: [...new Set(errors)],
      preview: { text: candidate.text, grade: Number.isFinite(grade) ? grade : null, type, correct: correct || null, topic: topicKey || null },
      data: parsed.success && errors.length === 0 ? parsed.data : undefined,
    });
  }
  return results;
}
