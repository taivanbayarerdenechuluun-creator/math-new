// LaTeX / энгийн бичлэгийг mathjs-ийн ойлгох илэрхийлэл рүү хөрвүүлэгч.
// Хэрэглэгч MathLive засварлагч, гараар бичсэн текст, эсвэл OCR-ийн LaTeX оруулж болно.

/** Тухайн байрлалаас эхэлсэн {...} блокийг (давхар хаалт тооцон) олно */
function readGroup(s: string, start: number): { content: string; end: number } | null {
  let i = start;
  while (s[i] === " ") i++;
  if (s[i] !== "{") {
    // \frac12 гэх мэт нэг тэмдэгт аргумент
    if (i < s.length) return { content: s[i], end: i + 1 };
    return null;
  }
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}") {
      depth--;
      if (depth === 0) return { content: s.slice(i + 1, j), end: j + 1 };
    }
  }
  return null;
}

function replaceCommandWithArgs(
  s: string,
  cmd: string,
  argc: number,
  build: (args: string[]) => string,
): string {
  let out = s;
  let guard = 0;
  while (guard++ < 200) {
    const idx = out.indexOf(cmd);
    if (idx === -1) break;
    // \fracx гэх мэт өөр командын нэг хэсэг биш эсэхийг шалгах
    const after = out[idx + cmd.length];
    if (after && /[a-zA-Z]/.test(after)) {
      // жишээ нь \sqrt-ийн оронд \sqrtx биш тохиолдол — нэг үсэгт аргумент гэж үзнэ
    }
    let pos = idx + cmd.length;
    const args: string[] = [];
    let okArgs = true;
    for (let a = 0; a < argc; a++) {
      const g = readGroup(out, pos);
      if (!g) {
        okArgs = false;
        break;
      }
      args.push(g.content);
      pos = g.end;
    }
    if (!okArgs) break;
    out = out.slice(0, idx) + build(args) + out.slice(pos);
  }
  return out;
}

const SIMPLE_REPLACEMENTS: [RegExp, string][] = [
  [/\^\s*\{?\s*\\circ\s*\}?|°/g, " deg"],
  [/\\left|\\right|\\displaystyle|\\,|\\;|\\!|\\quad|\\qquad|\\ /g, " "],
  [/\\cdot|\\times|×|·|∙/g, "*"],
  [/\\div|÷|:/g, "/"],
  [/−|–/g, "-"],
  [/\\leq?|≤|\\leqslant/g, "<="],
  [/\\geq?|≥|\\geqslant/g, ">="],
  [/\\neq|≠/g, "!="],
  [/\\lt/g, "<"],
  [/\\gt/g, ">"],
  [/\\pi|π/g, "pi"],
  [/\\infty|∞/g, "Infinity"],
  [/\\(arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|cot|sec|csc|exp)/g, "$1"],
  [/\\ln/g, "log"],
  [/\\lg/g, "log10"],
  [/\\%|%/g, "/100"],
  [/\\circ/g, "deg"],
  [/²/g, "^2"],
  [/³/g, "^3"],
  [/√\s*\(/g, "sqrt("],
  [/√\s*(\d+|[a-z])/g, "sqrt($1)"],
  [/\\text\{[^}]*\}/g, " "],
  [/\\mathrm\{([^}]*)\}/g, "$1"],
  [/\\operatorname\{([^}]*)\}/g, "$1"],
];

/** LaTeX → mathjs илэрхийлэл. Тэнцэтгэл, тэнцэтгэл биш тэмдгийг хадгална. */
export function latexToExpr(input: string): string {
  let s = input.trim();
  // $...$ ба \( \) хүрээг арилгах
  s = s.replace(/^\$+|\$+$/g, "").replace(/^\\\(|\\\)$/g, "").replace(/^\\\[|\\\]$/g, "");

  // log_{a}(x) / \log_a x
  s = s.replace(/\\log_\{([^}]*)\}\s*\(([^)]*)\)/g, "log($2, $1)");
  s = s.replace(/\\log_(\d+)\s*\(([^)]*)\)/g, "log($2, $1)");
  s = s.replace(/\\log_\{([^}]*)\}\s*([a-z0-9]+)/g, "log($2, $1)");
  s = s.replace(/\\log_(\d+)\s*([a-z0-9]+)/g, "log($2, $1)");
  s = s.replace(/\\log/g, "log10");

  // \sqrt[n]{x}
  s = s.replace(/\\sqrt\s*\[([^\]]+)\]/g, "\\nthroot{$1}");
  s = replaceCommandWithArgs(s, "\\nthroot", 2, ([n, x]) => `nthRoot((${x}), (${n}))`);
  for (const f of ["\\dfrac", "\\tfrac", "\\frac"]) {
    s = replaceCommandWithArgs(s, f, 2, ([a, b]) => `((${a})/(${b}))`);
  }
  s = replaceCommandWithArgs(s, "\\sqrt", 1, ([x]) => `sqrt(${x})`);

  for (const [re, rep] of SIMPLE_REPLACEMENTS) s = s.replace(re, rep);

  // үлдсэн LaTeX хаалтууд
  s = s.replace(/\{/g, "(").replace(/\}/g, ")");
  s = s.replace(/\\/g, "");
  // sin x → sin(x), sin 2x → sin(2x)
  s = s.replace(/\b(sin|cos|tan|cot|log|log10|sqrt|arcsin|arccos|arctan)\s+([0-9]*[a-z](?![a-z(])|[0-9.]+)/g, "$1($2)");
  // arcsin → asin (mathjs нэршил)
  s = s.replace(/\barcsin\b/g, "asin").replace(/\barccos\b/g, "acos").replace(/\barctan\b/g, "atan");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Математикийн тэмдэглэгээ агуулсан эсэх (энгийн текст бодлого эсэхийг ялгах) */
export function looksLikeMath(s: string): boolean {
  const letters = (s.match(/[а-яөүёА-ЯӨҮЁ]/g) ?? []).length;
  return letters < 6 && /[0-9a-z=+\-*/^()\\]/i.test(s);
}

/** Тэнцэтгэлүүдийг (систем) салгах: ; эсвэл шинэ мөр эсвэл \\ */
export function splitSystem(s: string): string[] {
  return s
    .replace(/\\begin\{(cases|array|aligned)\}(\{[^}]*\})?|\\end\{(cases|array|aligned)\}/g, "")
    .split(/\\\\|;|\n|,(?=[^()]*(?:\(|$))(?=.*=)/)
    .map((x) => x.replace(/&/g, "").trim())
    .filter(Boolean);
}
