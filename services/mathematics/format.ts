import { create, all, type MathNode } from "mathjs";

export const math = create(all, {});

const CONSTANTS = new Set(["pi", "e", "i", "Infinity", "deg", "true", "false", "E", "PI"]);

export function parse(expr: string): MathNode {
  return math.parse(expr);
}

/** Илэрхийлэл дэх хувьсагчдыг (функцийн нэр, тогтмолоос бусад) олох */
export function variablesOf(expr: string | MathNode): string[] {
  const node = typeof expr === "string" ? math.parse(expr) : expr;
  const vars = new Set<string>();
  node.traverse((n: MathNode, _path: string, parent: MathNode | null) => {
    if (n.type === "SymbolNode") {
      const name = (n as unknown as { name: string }).name;
      const isFnName = parent?.type === "FunctionNode" && (parent as unknown as { fn: MathNode }).fn === n;
      if (!isFnName && !CONSTANTS.has(name)) vars.add(name);
    }
  });
  return [...vars].sort();
}

/** mathjs илэрхийллийг LaTeX болгох (алдаа гарвал түүхий текстийг буцаана) */
export function tex(expr: string | MathNode): string {
  try {
    const node = typeof expr === "string" ? math.parse(expr) : expr;
    return node
      .toTex({ parenthesis: "auto", implicit: "hide" })
      .replace(/~/g, "")
      .replace(/\\cdot/g, "\\cdot ");
  } catch {
    return String(expr);
  }
}

export function isInt(n: number, eps = 1e-9) {
  return Math.abs(n - Math.round(n)) < eps;
}

/** Тоог хамгийн ойлгомжтой хэлбэрээр: бүхэл, энгийн бутархай, эсвэл аравтын */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (isInt(n)) return String(Math.round(n));
  try {
    const f = math.fraction(n) as unknown as { s: number | bigint; n: number | bigint; d: number | bigint };
    const d = Number(f.d);
    const num = Number(f.n) * Number(f.s);
    if (d <= 1000 && Math.abs(num / d - n) < 1e-10) return `${num}/${d}`;
  } catch {
    /* ignore */
  }
  return String(Math.round(n * 10000) / 10000);
}

/** fmtNum-ийн LaTeX хувилбар */
export function texNum(n: number): string {
  const s = fmtNum(n);
  const m = s.match(/^(-?)(\d+)\/(\d+)$/);
  if (m) return `${m[1]}\\frac{${m[2]}}{${m[3]}}`;
  return s;
}

export function approxEq(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
}

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Олон гишүүнтийн коэффициентүүдээс (өсөх зэргээр) LaTeX үүсгэх */
export function polyTex(coeffs: number[], v: string): string {
  const parts: string[] = [];
  for (let k = coeffs.length - 1; k >= 0; k--) {
    const c = coeffs[k];
    if (Math.abs(c) < 1e-12) continue;
    const sign = c < 0 ? "-" : "+";
    const abs = Math.abs(c);
    let coef = k === 0 ? texNum(abs) : isInt(abs) && Math.round(abs) === 1 ? "" : texNum(abs);
    if (coef.startsWith("\\frac") && k > 0) coef = coef + " ";
    const pow = k === 0 ? "" : k === 1 ? v : `${v}^{${k}}`;
    parts.push(`${sign} ${coef}${pow}`);
  }
  if (parts.length === 0) return "0";
  let s = parts.join(" ");
  s = s.replace(/^\+ /, "").replace(/^- /, "-");
  return s;
}

export function evalAt(expr: string, scope: Record<string, number>): number {
  const v = math.evaluate(expr, scope);
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "re" in v && "im" in v) {
    const c = v as { re: number; im: number };
    return Math.abs(c.im) < 1e-9 ? c.re : NaN;
  }
  return Number(v);
}
