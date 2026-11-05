import { describe, expect, it } from "vitest";
import { solveSymbolic } from "@/services/mathematics/solver";
import { latexToExpr } from "@/services/mathematics/latex";
import { expressionEquivalent, gradeAnswer, numericEquivalent } from "@/services/mathematics/equivalence";

const nums = (s: string) => s.split(";").map((x) => Number(eval(x.trim())));

describe("latexToExpr", () => {
  it("converts fractions, roots and powers", () => {
    expect(latexToExpr("\\frac{1}{2}+\\sqrt{16}")).toBe("((1)/(2))+sqrt(16)");
    expect(latexToExpr("x^{2}-5x+6=0")).toBe("x^(2)-5x+6=0");
    expect(latexToExpr("\\sqrt[3]{27}")).toBe("nthRoot((27), (3))");
    expect(latexToExpr("2\\cdot 3")).toBe("2* 3");
    expect(latexToExpr("\\sin 30^\\circ")).toContain("deg");
  });
});

describe("equations", () => {
  it("linear: 2x + 3 = 11 → x = 4", () => {
    const r = solveSymbolic("2x + 3 = 11")!;
    expect(r.kind).toBe("LINEAR_EQUATION");
    expect(r.finalAnswer).toBe("4");
    expect(r.verification).toBe("VERIFIED");
  });
  it("linear with fractions: 3x - 1 = x + 4 → 5/2", () => {
    const r = solveSymbolic("3x - 1 = x + 4")!;
    expect(r.finalAnswer).toBe("5/2");
  });
  it("quadratic: x^2 - 5x + 6 = 0 → 2; 3", () => {
    const r = solveSymbolic("x^{2}-5x+6=0")!;
    expect(r.kind).toBe("QUADRATIC_EQUATION");
    expect(nums(r.finalAnswer)).toEqual([2, 3]);
    expect(r.alternatives?.length).toBe(1);
    expect(r.verification).toBe("VERIFIED");
  });
  it("quadratic irrational: x^2 - 2x - 1 = 0 → 1 ± √2", () => {
    const r = solveSymbolic("x^2-2x-1=0")!;
    expect(r.finalAnswerLatex).toContain("\\sqrt{2}");
    expect(r.numeric![0]).toBeCloseTo(1 - Math.SQRT2, 9);
    expect(r.numeric![1]).toBeCloseTo(1 + Math.SQRT2, 9);
  });
  it("quadratic with no real roots", () => {
    const r = solveSymbolic("x^2 + x + 1 = 0")!;
    expect(r.finalAnswer).toBe("шийдгүй");
  });
  it("double root", () => {
    const r = solveSymbolic("x^2 - 6x + 9 = 0")!;
    expect(r.finalAnswer).toBe("3");
  });
  it("cubic with rational roots: x^3 - 6x^2 + 11x - 6 = 0", () => {
    const r = solveSymbolic("x^3-6x^2+11x-6=0")!;
    expect(r.numeric).toEqual([1, 2, 3]);
    expect(r.verification).toBe("VERIFIED");
  });
  it("rational equation discards extraneous root", () => {
    // (x^2 - 1)/(x - 1) = 0 → x = -1 only
    const r = solveSymbolic("\\frac{x^2-1}{x-1}=0")!;
    expect(r.numeric).toEqual([-1]);
  });
  it("exponential equation solved numerically: 2^x = 8", () => {
    const r = solveSymbolic("2^x = 8")!;
    expect(r.numeric![0]).toBeCloseTo(3, 6);
  });
});

describe("systems", () => {
  it("2x2: 2x + y = 7, x - y = -1 → x=2, y=3", () => {
    const r = solveSymbolic("2x + y = 7; x - y = -1")!;
    expect(r.kind).toBe("LINEAR_SYSTEM");
    expect(r.numeric![0]).toBeCloseTo(2);
    expect(r.numeric![1]).toBeCloseTo(3);
    expect(r.verification).toBe("VERIFIED");
  });
  it("3x3", () => {
    const r = solveSymbolic("x + y + z = 6\n2x - y + z = 3\nx + 2y - z = 2")!;
    expect(r.numeric!.map((x) => Math.round(x * 1e9) / 1e9)).toEqual([1, 2, 3]);
  });
  it("dependent system → infinitely many", () => {
    const r = solveSymbolic("x + y = 2; 2x + 2y = 4")!;
    expect(r.finalAnswer).toBe("төгсгөлгүй олон шийд");
  });
});

describe("inequalities", () => {
  it("linear with sign flip: -2x + 4 > 0 → x < 2", () => {
    const r = solveSymbolic("-2x + 4 > 0")!;
    expect(r.finalAnswer).toBe("(-inf; 2)");
  });
  it("quadratic: x^2 - 4 <= 0 → [-2; 2]", () => {
    const r = solveSymbolic("x^2 - 4 \\le 0")!;
    expect(r.finalAnswer).toBe("[-2; 2]");
    expect(r.verification).toBe("VERIFIED");
  });
  it("quadratic outside: x^2 - 5x + 6 > 0", () => {
    const r = solveSymbolic("x^2-5x+6>0")!;
    expect(r.finalAnswer).toBe("(-inf; 2) U (3; inf)");
  });
});

describe("derivatives and expressions", () => {
  it("derivative of x^3 + 2x", () => {
    const r = solveSymbolic("\\frac{d}{dx}(x^3 + 2x)")!;
    expect(r.kind).toBe("DERIVATIVE");
    expect(expressionEquivalent(r.finalAnswer, "3x^2+2")).toBe(true);
    expect(r.verification).toBe("VERIFIED");
  });
  it("derivative of x^2 sin(x) via d/dx", () => {
    const r = solveSymbolic("d/dx x^2*sin(x)")!;
    expect(expressionEquivalent(r.finalAnswer, "2x*sin(x)+x^2*cos(x)")).toBe(true);
  });
  it("arithmetic with fractions: 3/4 + 1/6 = 11/12", () => {
    const r = solveSymbolic("\\frac{3}{4}+\\frac{1}{6}")!;
    expect(r.finalAnswer).toBe("11/12");
  });
  it("order of operations: 2 + 3 * 4^2 = 50", () => {
    expect(solveSymbolic("2 + 3 * 4^2")!.finalAnswer).toBe("50");
  });
  it("factorises x^2 - 5x + 6", () => {
    const r = solveSymbolic("x^2 - 5x + 6")!;
    expect(r.finalAnswerLatex.replace(/\s/g, "")).toBe("(x-2)(x-3)");
  });
  it("returns null for Mongolian word problems (AI handles them)", () => {
    expect(solveSymbolic("Нэг сурагч 3 алим, нөгөө нь 5 алимтай бол нийт хэд вэ?")).toBeNull();
  });
});

describe("answer equivalence (exam grading)", () => {
  it("numeric with Mongolian decimal comma", () => {
    expect(numericEquivalent("2,5", "5/2")).toBe(true);
    expect(numericEquivalent("x = 0.5", "1/2")).toBe(true);
    expect(numericEquivalent("0.33", "1/3", 0.01)).toBe(true);
    expect(numericEquivalent("0.3", "1/3", 0.01)).toBe(false);
  });
  it("sets of roots, any order", () => {
    expect(numericEquivalent("3; 2", "2; 3")).toBe(true);
    expect(numericEquivalent("2", "2; 3")).toBe(false);
  });
  it("equivalent expressions", () => {
    expect(expressionEquivalent("(x+1)^2", "x^2+2x+1")).toBe(true);
    expect(expressionEquivalent("\\frac{x^2-1}{x-1}", "x+1")).toBe(true);
    expect(expressionEquivalent("x^2+1", "x^2+2x+1")).toBe(false);
  });
  it("gradeAnswer dispatch", () => {
    expect(gradeAnswer({ type: "MULTIPLE_CHOICE", correctAnswer: "B", options: [{ label: "A", isCorrect: false }, { label: "B", isCorrect: true }] }, "b")).toBe(true);
    expect(gradeAnswer({ type: "NUMERIC", correctAnswer: "12" }, "12.0")).toBe(true);
    expect(gradeAnswer({ type: "OPEN", correctAnswer: null }, "anything")).toBeNull();
    expect(gradeAnswer({ type: "NUMERIC", correctAnswer: "12" }, "")).toBe(false);
  });
});

import { extractPureMath } from "@/services/mathematics/extract";
describe("extractPureMath (Mongolian instruction + formula)", () => {
  it("extracts formula from pure instructions", () => {
    expect(extractPureMath("Тэгшитгэлийг бод: $x^2-5x+6=0$")).toBe("x^2-5x+6=0");
    expect(extractPureMath("Бод: $\\log_2 32$")).toBe("\\log_2 32");
  });
  it("refuses word problems with real content", () => {
    expect(extractPureMath("Радиус нь $5$ см тойргийн уртыг ол.")).toBeNull();
    expect(extractPureMath("$f(x) = x^2 - 4x + 1$ функцийн хамгийн бага утгыг ол.")).toBeNull();
  });
});
