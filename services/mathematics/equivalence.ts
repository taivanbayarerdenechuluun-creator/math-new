// Шалгалтын хариултыг автоматаар үнэлэх: тоон хүлцэл, тэнцүү илэрхийлэл, олон утга.
import { latexToExpr } from "./latex";
import { approxEq, evalAt, math, variablesOf } from "./format";

/** Хэрэглэгчийн хариуг цэвэрлэх: "x = 2,5" → "2.5" */
export function normalizeAnswer(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^\$+|\$+$/g, "");
  s = s.replace(/^[a-zA-Z]\s*(_\{?\d+\}?)?\s*=\s*/, ""); // x = ..., x_1 = ...
  // Монгол бичлэгт аравтын таслал: 2,5 → 2.5 (тоонуудын хооронд л)
  s = s.replace(/(\d),(\d)/g, "$1.$2");
  return s.trim();
}

function splitValues(s: string): string[] {
  return s
    .split(/;|\bба\b|\band\b|,\s+(?=[-\d])/)
    .map((x) => normalizeAnswer(x))
    .filter(Boolean);
}

function toNumber(s: string): number | null {
  try {
    const v = evalAt(latexToExpr(s), {});
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Тоон хариулт (нэг эсвэл ";"-ээр тусгаарласан олон утга, дарааллаас үл хамаарна) */
export function numericEquivalent(student: string, correct: string, tolerance?: number | null): boolean {
  const sv = splitValues(student);
  const cv = splitValues(correct);
  if (sv.length === 0 || sv.length !== cv.length) return false;
  const sn = sv.map(toNumber);
  const cn = cv.map(toNumber);
  if (sn.some((x) => x === null) || cn.some((x) => x === null)) return false;
  const a = (sn as number[]).sort((x, y) => x - y);
  const b = (cn as number[]).sort((x, y) => x - y);
  return a.every((x, i) => (tolerance != null && tolerance > 0 ? Math.abs(x - b[i]) <= tolerance + 1e-12 : approxEq(x, b[i], 1e-9)));
}

/** Хоёр илэрхийлэл математикийн хувьд тэнцүү эсэх (санамсаргүй цэгүүдэд харьцуулах) */
export function expressionEquivalent(student: string, correct: string): boolean {
  let a: string;
  let b: string;
  try {
    a = latexToExpr(normalizeAnswer(student));
    b = latexToExpr(normalizeAnswer(correct));
    math.parse(a);
    math.parse(b);
  } catch {
    return false;
  }
  const vars = [...new Set([...variablesOf(a), ...variablesOf(b)])];
  if (vars.length === 0) return numericEquivalent(student, correct);
  let tested = 0;
  // тогтмол үр, давтагдах боломжтой цэгүүд
  const samples = [0.37, 1.21, -0.83, 2.47, -1.69, 0.91, 3.13, -2.29, 1.73, 0.53];
  for (let t = 0; t < samples.length && tested < 6; t++) {
    const scope = Object.fromEntries(vars.map((v, j) => [v, samples[(t + j * 3) % samples.length]]));
    let va: number;
    let vb: number;
    try {
      va = evalAt(a, scope);
      vb = evalAt(b, scope);
    } catch {
      continue;
    }
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
    if (!approxEq(va, vb, 1e-7)) return false;
    tested++;
  }
  return tested >= 3;
}

export interface GradeInput {
  type: string;
  correctAnswer: string | null;
  tolerance?: number | null;
  options?: { label: string; isCorrect: boolean }[];
}

/** Нэг асуултын хариуг үнэлэх. OPEN төрөлд null (багш шалгана). */
export function gradeAnswer(q: GradeInput, answer: string | null | undefined): boolean | null {
  if (answer == null || answer.trim() === "") return false;
  switch (q.type) {
    case "MULTIPLE_CHOICE": {
      const correct = q.options?.find((o) => o.isCorrect)?.label ?? q.correctAnswer ?? "";
      return answer.trim().toUpperCase() === correct.trim().toUpperCase();
    }
    case "NUMERIC":
      return q.correctAnswer ? numericEquivalent(answer, q.correctAnswer, q.tolerance) : null;
    case "EXPRESSION":
      return q.correctAnswer ? expressionEquivalent(answer, q.correctAnswer) : null;
    default:
      return null;
  }
}
