// Жишээ сангийн хариуг тооцооллын хөдөлгүүрээр бие даан шалгах.
import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/database/seed/questions";
import { EXTRA_QUESTIONS } from "@/database/seed/questions-extra";
import { EXTRA_LESSONS } from "@/database/seed/lessons-extra";
import { CURRICULUM } from "@/database/seed/curriculum";

const ALL = [...QUESTIONS, ...EXTRA_QUESTIONS];

describe("curriculum coverage", () => {
  it("every topic has at least one lesson", () => {
    const missing = CURRICULUM.flatMap((g) => g.units.flatMap((u) => u.topics))
      .filter((t) => !(t.lessons?.length) && !EXTRA_LESSONS[t.slug]?.length)
      .map((t) => t.slug);
    expect(missing).toEqual([]);
  });
  it("every question references an existing topic", () => {
    const slugs = new Set(CURRICULUM.flatMap((g) => g.units.flatMap((u) => u.topics.map((t) => t.slug))));
    expect(ALL.filter((q) => !slugs.has(q.topic)).map((q) => q.key)).toEqual([]);
  });
});
import { gradeAnswer, numericEquivalent, expressionEquivalent } from "@/services/mathematics/equivalence";
import { solveSymbolic } from "@/services/mathematics/solver";

describe("seed questions are self-consistent", () => {
  it("question texts are unique (no duplicates across base + extra)", () => {
    const texts = [...QUESTIONS, ...EXTRA_QUESTIONS].map((q) => q.text.replace(/\s+/g, ""));
    expect(new Set(texts).size).toBe(texts.length);
  });
  for (const q of [...QUESTIONS, ...EXTRA_QUESTIONS].filter((x) => x.type !== "OPEN")) {
    it(`${q.key}: stored answer grades as correct`, () => {
      const options = (q.options ?? []).map(([label]) => ({ label, isCorrect: label === q.answer }));
      expect(gradeAnswer({ type: q.type, correctAnswer: q.answer, tolerance: q.tolerance, options }, q.answer)).toBe(true);
      if (q.type === "MULTIPLE_CHOICE") expect(options.filter((o) => o.isCorrect)).toHaveLength(1);
    });
  }
});

describe("seed answers independently verified by the solver", () => {
  const cases: [string, string][] = [
    ["q3", "\\frac{2}{3}+\\frac{1}{4}"],
    ["q8", "2.5*0.4"],
    ["q9", "-7 + 12 - (-3)"],
    ["q10", "3x - 7 = 11"],
    ["q23", "x^2 - 5x + 6 = 0"],
    ["q24", "x^2 - 6x + 9 = 0"],
    ["q32", "2^{x+1} = 16"],
    ["q31", "\\log_{2}(32)"],
    ["q37", "\\cos(60^\\circ)"],
    ["r1", "2x^2 + 3x - 2 = 0"],
    ["r2", "\\log_{3}(18) - \\log_{3}(2)"],
    ["d1", "5x + 2 = 2x + 14"],
  ];
  cases.push(
    ["x3", "\\frac{5}{6}-\\frac{3}{8}"],
    ["x6", "2(x - 3) = x + 4"],
    ["x7", "\\frac{x}{3} + 1 = 5"],
    ["x12", "3^{-2}"],
    ["x15", "x + y = 10; x - y = 4"],
    ["x20", "2x^2 + 3x - 2 = 0"],
    ["x26", "\\sin(30^\\circ) + \\cos(60^\\circ)"],
    ["x27", "\\log_{2}(8) + \\log_{2}(4)"],
    ["x28", "5^{2x - 1} = 125"],
    ["x29", "9^x = 27"],
    ["x35", "100*101/2"],
    ["x45", "1000000*1.1^3"],
  );
  for (const [key, problem] of cases) {
    it(`${key}: ${problem}`, () => {
      const q = ALL.find((x) => x.key === key)!;
      const r = solveSymbolic(problem)!;
      expect(r).not.toBeNull();
      // систем бол зөвхөн тухайн хувьсагчийн утгыг харьцуулна (x15 → y)
      const values = key === "x15" ? [r.numeric![1]] : r.numeric!;
      expect(numericEquivalent(values.join("; "), q.answer, 1e-6)).toBe(true);
    });
  }
  it("x41: product rule derivative matches", () => {
    const r = solveSymbolic("d/dx x^2*sin(x)")!;
    expect(expressionEquivalent(r.finalAnswer, ALL.find((q) => q.key === "x41")!.answer)).toBe(true);
  });
  it("x13 / x8 / x30: expressions", () => {
    expect(expressionEquivalent(solveSymbolic("\\frac{x^7 \\cdot x^2}{x^5}")!.finalAnswer, "x^4")).toBe(true);
    expect(expressionEquivalent(solveSymbolic("5a - 2(a + 4)")!.finalAnswer, "3a - 8")).toBe(true);
    // урвуу функц: f(f^{-1}(x)) = x
    expect(expressionEquivalent("3*((x + 6)/3) - 6", "x")).toBe(true);
  });

  it("q44: derivative matches", () => {
    const r = solveSymbolic("\\frac{d}{dx}(x^3 - 2x^2 + 5)")!;
    expect(expressionEquivalent(r.finalAnswer, "3x^2 - 4x")).toBe(true);
  });
  it("q11: simplification matches", () => {
    const r = solveSymbolic("3(x + 2) - 2(x - 1)")!;
    expect(expressionEquivalent(r.finalAnswer, "x + 8")).toBe(true);
  });
  it("q18: system x value", () => {
    const r = solveSymbolic("2x + y = 7; x - y = -1")!;
    expect(r.numeric![0]).toBeCloseTo(2);
  });
});
