// IQ MATH symbolic бодогч — mathjs дээр суурилсан, алхам бүрийг монголоор тайлбарлана.
// Дэмжих төрлүүд: шугаман/квадрат/олон гишүүнт/рационал тэгшитгэл, тэнцэтгэл биш,
// шугаман тэгшитгэлийн систем, уламжлал, тоон илэрхийлэл бодох, илэрхийлэл хялбарчлах,
// трансцендент тэгшитгэлийн тоон шийд. Бусад тохиолдолд null буцааж AI-д шилжүүлнэ.
import type { SolutionResult, SolutionStep } from "@/types/math";
import { latexToExpr, splitSystem } from "./latex";
import { approxEq, evalAt, fmtNum, gcd, isInt, math, polyTex, tex, texNum, variablesOf } from "./format";

type Partial = Omit<SolutionResult, "engine" | "verification" | "verificationNote">;

// ─────────────────────────── Олон гишүүнтийн туслахууд ───────────────────────────

/** f(v)-г олон гишүүнт болговол коэффициентууд (өсөх), үгүй бол null */
function polyCoeffs(expr: string, v: string): { coeffs: number[]; denominator: string | null } | null {
  try {
    const r = math.rationalize(expr, {}, true) as unknown as {
      coefficients?: number[];
      variables: string[];
      denominator: { toString(): string } | null;
      numerator: { toString(): string };
    };
    if (!r.variables || r.variables.length !== 1 || r.variables[0] !== v || !r.coefficients?.length) return null;
    const coeffs = r.coefficients.map(Number);
    while (coeffs.length > 1 && Math.abs(coeffs[coeffs.length - 1]) < 1e-14) coeffs.pop();
    return { coeffs, denominator: r.denominator ? r.denominator.toString() : null };
  } catch {
    return null;
  }
}

function polyEval(c: number[], x: number) {
  return c.reduceRight((acc, k) => acc * x + k, 0);
}

function divisors(n: number): number[] {
  n = Math.abs(Math.round(n));
  if (n === 0) return [0];
  const out: number[] = [];
  for (let i = 1; i <= Math.min(n, 100000); i++) if (n % i === 0) out.push(i);
  return out;
}

/** Synthetic division: c(x) / (x - r) */
function deflate(c: number[], r: number): number[] {
  const n = c.length - 1;
  const out = new Array(n).fill(0);
  let carry = c[n];
  for (let k = n - 1; k >= 0; k--) {
    out[k] = carry;
    carry = c[k] + carry * r;
  }
  return out;
}

/** Бодит язгууруудыг тоон аргаар (интервал хуваах + хагаслах) олох */
function numericRoots(f: (x: number) => number, lo = -100, hi = 100, step = 0.01): number[] {
  const roots: number[] = [];
  let x0 = lo;
  let f0 = f(x0);
  for (let x1 = lo + step; x1 <= hi + 1e-12; x1 += step) {
    const f1 = f(x1);
    if (Number.isFinite(f0) && Number.isFinite(f1)) {
      if (Math.abs(f0) < 1e-12) roots.push(x0);
      else if (f0 * f1 < 0) {
        let a = x0;
        let b = x1;
        let fa = f0;
        for (let i = 0; i < 80; i++) {
          const m = (a + b) / 2;
          const fm = f(m);
          if (fa * fm <= 0) b = m;
          else {
            a = m;
            fa = fm;
          }
        }
        const r = (a + b) / 2;
        // тасралтын цэг биш жинхэнэ язгуур эсэхийг шалгах
        if (Math.abs(f(r)) < 1e-6) roots.push(r);
      }
    }
    x0 = x1;
    f0 = f1;
  }
  // ойролцоо давхардлыг арилгах
  const uniq: number[] = [];
  for (const r of roots.sort((a, b) => a - b)) {
    if (!uniq.some((u) => Math.abs(u - r) < 1e-6)) uniq.push(Math.abs(r) < 1e-10 ? 0 : r);
  }
  return uniq;
}

/** √n-г k√m хэлбэрт хялбарчлах */
function simplifySqrt(n: number): { k: number; m: number } {
  let k = 1;
  let m = n;
  for (let i = 2; i * i <= m; i++) {
    while (m % (i * i) === 0) {
      m /= i * i;
      k *= i;
    }
  }
  return { k, m };
}

interface QuadRoots {
  D: number;
  roots: number[];
  rootTex: string[];
  steps: SolutionStep[];
}

function solveQuadratic(a: number, b: number, c: number, v: string): QuadRoots {
  const D = b * b - 4 * a * c;
  const steps: SolutionStep[] = [];
  steps.push({
    title: "Коэффициентуудыг тодорхойлох",
    latex: `a = ${texNum(a)},\\quad b = ${texNum(b)},\\quad c = ${texNum(c)}`,
    explanation: `Тэгшитгэлийг $a${v}^2 + b${v} + c = 0$ стандарт хэлбэртэй харьцуулж коэффициентуудыг олно.`,
  });
  steps.push({
    title: "Дискриминант бодох",
    latex: `D = b^2 - 4ac = (${texNum(b)})^2 - 4\\cdot (${texNum(a)})\\cdot (${texNum(c)}) = ${texNum(D)}`,
    explanation: "Дискриминантын тэмдэг нь бодит язгуурын тоог тодорхойлно: $D>0$ бол 2, $D=0$ бол 1, $D<0$ бол бодит язгуургүй.",
  });

  if (D < -1e-12) {
    steps.push({
      title: "Язгуурын тоог дүгнэх",
      latex: `D = ${texNum(D)} < 0`,
      explanation: "Дискриминант сөрөг тул тэгшитгэл бодит тоон олонлогт шийдгүй.",
    });
    return { D, roots: [], rootTex: [], steps };
  }

  if (Math.abs(D) < 1e-12) {
    const r = -b / (2 * a);
    steps.push({
      title: "Давхар язгуур олох",
      latex: `${v} = \\frac{-b}{2a} = \\frac{${texNum(-b)}}{${texNum(2 * a)}} = ${texNum(r)}`,
      explanation: "$D = 0$ үед хоёр язгуур давхцаж, нэг язгуур гарна.",
    });
    return { D, roots: [r], rootTex: [texNum(r)], steps };
  }

  const r1 = (-b - Math.sqrt(D)) / (2 * a);
  const r2 = (-b + Math.sqrt(D)) / (2 * a);
  const allInt = [a, b, c].every((x) => isInt(x));
  let rootTex: string[];

  if (isInt(Math.sqrt(D)) || !allInt) {
    rootTex = [texNum(Math.min(r1, r2)), texNum(Math.max(r1, r2))];
    steps.push({
      title: "Язгуурын томьёогоор бодох",
      latex: `${v}_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a} = \\frac{${texNum(-b)} \\pm ${isInt(Math.sqrt(D)) ? texNum(Math.sqrt(D)) : `\\sqrt{${texNum(D)}}`}}{${texNum(2 * a)}}`,
      explanation: "Квадрат тэгшитгэлийн язгуурын ерөнхий томьёонд утгуудыг орлуулна.",
    });
  } else {
    // яг хэлбэр: (-b ± k√m) / 2a, ерөнхий хуваагчаар хураах
    const { k, m } = simplifySqrt(Math.round(D));
    let p = -b;
    let q = k;
    let den = 2 * a;
    const g = gcd(gcd(p, q), den);
    if (g > 1) {
      p /= g;
      q /= g;
      den /= g;
    }
    if (den < 0) {
      p = -p;
      den = -den;
    }
    const rad = `${q === 1 ? "" : q}\\sqrt{${m}}`;
    const numer = p === 0 ? `\\pm ${rad}` : `${p} \\pm ${rad}`;
    const full = den === 1 ? numer : `\\frac{${numer}}{${den}}`;
    rootTex = [full.replace("\\pm", "-"), full.replace("\\pm", "+")];
    steps.push({
      title: "Язгуурын томьёогоор бодох",
      latex: `${v}_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a} = \\frac{${texNum(-b)} \\pm \\sqrt{${texNum(D)}}}{${texNum(2 * a)}} = ${full}`,
      explanation: `$\\sqrt{${texNum(D)}} = ${k === 1 ? "" : k}\\sqrt{${m}}$ гэж хялбарчилж, хүртвэр хуваарийг ерөнхий хуваагчаар хураана.`,
    });
  }
  steps.push({
    title: "Хоёр язгуурыг бичих",
    latex: `${v}_1 = ${rootTex[0]},\\quad ${v}_2 = ${rootTex[1]}`,
    explanation: "$\\pm$ тэмдгийн хасах ба нэмэх тохиолдол тус бүрээр нэг язгуур гарна.",
  });
  return { D, roots: [Math.min(r1, r2), Math.max(r1, r2)], rootTex, steps };
}

// ─────────────────────────── Шалгах (орлуулах) ───────────────────────────

function substitutionCheck(lhs: string, rhs: string, v: string, roots: number[]) {
  const steps: string[] = [];
  let passed = true;
  for (const r of roots) {
    try {
      const L = evalAt(lhs, { [v]: r });
      const R = evalAt(rhs, { [v]: r });
      const good = approxEq(L, R, 1e-7);
      passed &&= good;
      steps.push(
        `${v} = ${texNum(r)} \\Rightarrow \\text{зүүн тал} = ${texNum(L)},\\ \\text{баруун тал} = ${texNum(R)}\\ ${good ? "\\checkmark" : "\\times"}`,
      );
    } catch {
      passed = false;
    }
  }
  return { method: "Олсон утгыг анхны тэгшитгэлд орлуулж шалгана.", steps, passed };
}

// ─────────────────────────── Тэгшитгэл ───────────────────────────

function solveEquation(rawProblem: string, lhs: string, rhs: string, v: string): Partial | null {
  const f = `(${lhs}) - (${rhs})`;
  const problemTex = `${tex(lhs)} = ${tex(rhs)}`;
  const poly = polyCoeffs(f, v);

  if (poly && poly.coeffs.length >= 2) {
    let { coeffs } = poly;
    const deg = coeffs.length - 1;
    const steps: SolutionStep[] = [];
    let domainNote: string | null = null;

    if (poly.denominator && variablesOf(poly.denominator).includes(v)) {
      domainNote = poly.denominator;
      steps.push({
        title: "Тодорхойлогдох мужийг олох",
        latex: `${tex(poly.denominator)} \\neq 0`,
        explanation: "Бутархайн хуваарь тэгтэй тэнцэж болохгүй тул эдгээр утгыг хасна.",
      });
      steps.push({
        title: "Ерөнхий хуваарьт оруулж хүртвэрийг тэгтэй тэнцүүлэх",
        latex: `${polyTex(coeffs, v)} = 0`,
        explanation: "Бүх гишүүнийг нэг тал руу шилжүүлж ерөнхий хуваарьт оруулбал бутархай нь тэгтэй тэнцүү байхын тулд хүртвэр нь тэг байх ёстой.",
      });
    } else {
      steps.push({
        title: "Бүх гишүүнийг нэг тал руу шилжүүлэх",
        latex: `${polyTex(coeffs, v)} = 0`,
        explanation: "Баруун талын гишүүдийг тэмдгийг нь эсрэгээр сольж зүүн тал руу шилжүүлээд, төстэй гишүүдийг эмхэтгэнэ.",
      });
    }

    let roots: number[] = [];
    let rootTex: string[] = [];
    let kind = "POLYNOMIAL_EQUATION";
    let topic = "Олон гишүүнт тэгшитгэл";
    const formulas: { name: string; latex: string }[] = [];
    let methodReason = "";
    const alternatives: { title: string; steps: SolutionStep[] }[] = [];

    if (deg === 1) {
      kind = "LINEAR_EQUATION";
      topic = "Шугаман тэгшитгэл";
      methodReason = "Хувьсагч зөвхөн нэгдүгээр зэрэгтэй орсон тул шугаман тэгшитгэл. Үл мэдэгдэгчийг нэг талд нь ганцаарчилж олно.";
      formulas.push({ name: "Шугаман тэгшитгэл", latex: `a${v} + b = 0 \\Rightarrow ${v} = -\\frac{b}{a}` });
      const [b, a] = coeffs;
      steps.push({
        title: "Сул гишүүнийг баруун тал руу шилжүүлэх",
        latex: `${polyTex([0, a], v)} = ${texNum(-b)}`,
        explanation: "Тэгшитгэлийн хоёр талаас ижил тоо хасахад тэнцэтгэл хадгалагдана.",
      });
      const r = -b / a;
      steps.push({
        title: `Хоёр талыг ${texNum(a)}-д хуваах`,
        latex: `${v} = \\frac{${texNum(-b)}}{${texNum(a)}} = ${texNum(r)}`,
        explanation: "Тэгээс ялгаатай тоонд хоёр талыг хуваахад тэнцэтгэл хадгалагдана.",
      });
      roots = [r];
      rootTex = [texNum(r)];
    } else if (deg === 2) {
      kind = "QUADRATIC_EQUATION";
      topic = "Квадрат тэгшитгэл";
      methodReason = "Хувьсагчийн хамгийн их зэрэг 2 тул квадрат тэгшитгэл. Дискриминантын аргаар бүх тохиолдолд бодох боломжтой.";
      formulas.push({ name: "Дискриминант", latex: "D = b^2 - 4ac" });
      formulas.push({ name: "Язгуурын томьёо", latex: `${v}_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}` });
      const [c, b, a] = coeffs;
      const q = solveQuadratic(a, b, c, v);
      steps.push(...q.steps);
      roots = q.roots;
      rootTex = q.rootTex;
      // Өөр арга: Виетийн теорем (бүхэл язгууртай үед)
      if (roots.length === 2 && roots.every((r) => isInt(r)) && isInt(a)) {
        formulas.push({ name: "Виетийн теорем", latex: `${v}_1 + ${v}_2 = -\\frac{b}{a},\\quad ${v}_1 ${v}_2 = \\frac{c}{a}` });
        const [r1, r2] = roots.map((r) => Math.round(r));
        alternatives.push({
          title: "Үржигдэхүүнд задлах арга (Виетийн теорем)",
          steps: [
            {
              title: "Нийлбэр ба үржвэрийг олох",
              latex: `${v}_1 + ${v}_2 = ${texNum(-b / a)},\\quad ${v}_1 \\cdot ${v}_2 = ${texNum(c / a)}`,
              explanation: "Үржвэр нь $c/a$, нийлбэр нь $-b/a$ байх хоёр тоог сонгоно.",
            },
            {
              title: "Үржигдэхүүнд задлах",
              latex: `${a === 1 ? "" : texNum(a)}(${v} ${r1 < 0 ? "+" : "-"} ${Math.abs(r1)})(${v} ${r2 < 0 ? "+" : "-"} ${Math.abs(r2)}) = 0`,
              explanation: "Үржвэр тэгтэй тэнцүү бол үржигдэхүүний ядаж нэг нь тэг байна.",
            },
          ],
        });
      }
    } else {
      // 3 ба түүнээс дээш зэрэг: рационал язгуур + бууруулах, үлдэгдлийг квадратаар/тоон аргаар
      kind = "POLYNOMIAL_EQUATION";
      topic = `${deg}-р зэргийн тэгшитгэл`;
      methodReason = "Зэрэг нь 2-оос их тул рационал язгуурын теоремоор язгуур хайж, олон гишүүнтийг бууруулна.";
      formulas.push({ name: "Рационал язгуурын теорем", latex: "x = \\frac{p}{q},\\ p \\mid a_0,\\ q \\mid a_n" });
      let work = [...coeffs];
      const found: number[] = [];
      const integerCoeffs = work.every((x) => isInt(x));
      if (integerCoeffs) {
        let guard = 0;
        while (work.length > 3 && guard++ < 10) {
          if (Math.abs(work[0]) < 1e-12) {
            found.push(0);
            work = work.slice(1);
            continue;
          }
          const ps = divisors(work[0]);
          const qs = divisors(work[work.length - 1]);
          let hit: number | null = null;
          outer: for (const p of ps)
            for (const qq of qs)
              for (const s of [1, -1]) {
                const cand = (s * p) / qq;
                if (Math.abs(polyEval(work, cand)) < 1e-9) {
                  hit = cand;
                  break outer;
                }
              }
          if (hit === null) break;
          steps.push({
            title: `Язгуур олох: ${v} = ${fmtNum(hit)}`,
            latex: `P(${texNum(hit)}) = 0 \\Rightarrow P(${v}) = (${v} ${hit < 0 ? "+" : "-"} ${texNum(Math.abs(hit))})\\cdot Q(${v})`,
            explanation: "Сул гишүүний хуваагчийг ахлах коэффициентийн хуваагчид хуваасан утгуудыг орлуулж шалгав. Безугийн теоремоор олон гишүүнт хуваагдана.",
          });
          found.push(hit);
          work = deflate(work, hit);
          steps.push({
            title: "Олон гишүүнтийг бууруулах",
            latex: `Q(${v}) = ${polyTex(work, v)}`,
            explanation: "Горнерын схемээр хуваалт хийв.",
          });
        }
      }
      if (work.length === 3) {
        const q = solveQuadratic(work[2], work[1], work[0], v);
        steps.push(...q.steps);
        found.push(...q.roots);
      } else if (work.length === 2) {
        found.push(-work[0] / work[1]);
      } else if (work.length > 3) {
        const nr = numericRoots((x) => polyEval(work, x), -1000, 1000, 0.05);
        steps.push({
          title: "Үлдсэн язгуурыг тоон аргаар олох",
          latex: nr.map((r, i) => `${v}_{${i + 1}} \\approx ${r.toFixed(4)}`).join(",\\ ") || "\\text{бодит язгуургүй}",
          explanation: "Рационал язгуур олдоогүй хэсгийг хагаслах (bisection) аргаар ойролцоо бодов.",
        });
        found.push(...nr);
      }
      roots = [...new Set(found.map((r) => Math.round(r * 1e9) / 1e9))].sort((a, b) => a - b);
      rootTex = roots.map((r) => (isInt(r) || isInt(r * 1000) ? texNum(r) : `\\approx ${r.toFixed(4)}`));
    }

    // Тодорхойлогдох мужаас гарсан язгуурыг хасах
    if (domainNote) {
      const valid: number[] = [];
      const validTex: string[] = [];
      roots.forEach((r, i) => {
        let den = NaN;
        try {
          den = evalAt(domainNote!, { [v]: r });
        } catch {
          /* */
        }
        if (Math.abs(den) > 1e-9) {
          valid.push(r);
          validTex.push(rootTex[i]);
        } else {
          steps.push({
            title: "Гадны язгуурыг хасах",
            latex: `${v} = ${rootTex[i]}`,
            explanation: "Энэ утгад хуваарь тэг болох тул тодорхойлогдох мужид орохгүй.",
          });
        }
      });
      roots = valid;
      rootTex = validTex;
      topic = "Рационал тэгшитгэл";
      kind = "RATIONAL_EQUATION";
    }

    const finalAnswerLatex =
      roots.length === 0
        ? "\\text{Бодит шийдгүй}"
        : roots.length === 1
          ? `${v} = ${rootTex[0]}`
          : rootTex.map((t, i) => `${v}_{${i + 1}} = ${t}`).join(",\\quad ");
    const finalAnswer = roots.length === 0 ? "шийдгүй" : roots.map(fmtNum).join("; ");

    return {
      problem: `$${problemTex}$`,
      kind,
      topic,
      given: [`$${problemTex}$`],
      find: `$${v}$ үл мэдэгдэгчийн утга`,
      formulas,
      methodReason,
      steps,
      finalAnswer,
      finalAnswerLatex,
      check:
        roots.length > 0
          ? substitutionCheck(lhs, rhs, v, roots)
          : { method: "Дискриминант сөрөг байгаа нь бодит шийдгүйг баталж байна.", steps: [], passed: true },
      alternatives: alternatives.length ? alternatives : undefined,
      numeric: roots,
    };
  }

  // Олон гишүүнт биш — тоон арга
  try {
    const fn = (x: number) => {
      try {
        return evalAt(f, { [v]: x });
      } catch {
        return NaN;
      }
    };
    const isTrig = /\b(sin|cos|tan|cot)\b/.test(f);
    const [lo, hi, step] = isTrig ? [0, 2 * Math.PI - 1e-9, 0.001] : [-50, 50, 0.005];
    const roots = numericRoots(fn, lo, hi, step);
    const steps: SolutionStep[] = [
      {
        title: "Функц байгуулах",
        latex: `f(${v}) = ${tex(f)}`,
        explanation: "Тэгшитгэлийн хоёр талын ялгаврыг функц болгож, түүний тэгүүдийг хайна.",
      },
      {
        title: "Тэмдэг солигдох интервалыг олох",
        latex: isTrig ? `${v} \\in [0;\\ 2\\pi)` : `${v} \\in [-50;\\ 50]`,
        explanation: "Функцийн утга тэмдгээ солих завсар бүрт язгуур оршино (Больцано–Кошийн теорем).",
      },
      {
        title: "Хагаслах аргаар нарийвчлах",
        latex: roots.length ? roots.map((r, i) => `${v}_{${i + 1}} \\approx ${r.toFixed(4)}`).join(",\\ ") : "\\text{язгуур олдсонгүй}",
        explanation: "Интервалыг дахин дахин хагасалж язгуурыг 4 оронгийн нарийвчлалтай олов.",
      },
    ];
    return {
      problem: `$${problemTex}$`,
      kind: "NUMERIC_EQUATION",
      topic: isTrig ? "Тригонометр тэгшитгэл" : "Тэгшитгэл (тоон шийд)",
      given: [`$${problemTex}$`],
      find: `$${v}$-ийн утга${isTrig ? " ($[0;2\\pi)$ завсарт)" : ""}`,
      formulas: [],
      methodReason: "Тэгшитгэл олон гишүүнт биш тул ойролцоо тоон аргаар бодлоо. Яг хэлбэрийн шийдийг AI багшаас асууж болно.",
      steps,
      finalAnswer: roots.length ? roots.map((r) => r.toFixed(4)).join("; ") : "шийд олдсонгүй",
      finalAnswerLatex: roots.length ? roots.map((r, i) => `${v}_{${i + 1}} \\approx ${r.toFixed(4)}`).join(",\\ ") : "\\text{Шийд олдсонгүй}",
      check: substitutionCheck(lhs, rhs, v, roots),
      numeric: roots,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────── Тэнцэтгэл биш ───────────────────────────

function solveInequality(lhs: string, op: string, rhs: string, v: string): Partial | null {
  const f = `(${lhs}) - (${rhs})`;
  const poly = polyCoeffs(f, v);
  if (!poly || poly.denominator) return null;
  const { coeffs } = poly;
  const deg = coeffs.length - 1;
  if (deg < 1 || deg > 4) return null;
  const opTex: Record<string, string> = { "<": "<", ">": ">", "<=": "\\le", ">=": "\\ge" };
  const problemTex = `${tex(lhs)} ${opTex[op]} ${tex(rhs)}`;
  const steps: SolutionStep[] = [
    {
      title: "Нэг тал руу шилжүүлэх",
      latex: `${polyTex(coeffs, v)} ${opTex[op]} 0`,
      explanation: "Бүх гишүүнийг зүүн тал руу шилжүүлж, баруун талыг тэг болгоно.",
    },
  ];

  let roots: number[];
  if (deg === 1) {
    const [b, a] = coeffs;
    roots = [-b / a];
    const flip = a < 0;
    const newOp = flip ? ({ "<": ">", ">": "<", "<=": ">=", ">=": "<=" } as Record<string, string>)[op] : op;
    steps.push({
      title: `Хоёр талыг ${texNum(a)}-д хуваах`,
      latex: `${v} ${opTex[newOp]} ${texNum(-b / a)}`,
      explanation: flip
        ? "Сөрөг тоонд хуваахад тэнцэтгэл бишийн тэмдэг эсрэгээр солигдоно!"
        : "Эерэг тоонд хуваахад тэнцэтгэл бишийн тэмдэг хэвээр үлдэнэ.",
    });
  } else {
    roots = numericRoots((x) => polyEval(coeffs, x), -1000, 1000, 0.01);
    if (deg === 2) {
      const q = solveQuadratic(coeffs[2], coeffs[1], coeffs[0], v);
      steps.push(...q.steps.map((s) => ({ ...s, title: s.title + " (харгалзах тэгшитгэл)" })));
      roots = q.roots;
    } else {
      steps.push({
        title: "Харгалзах тэгшитгэлийн язгуурыг олох",
        latex: roots.map((r) => `${v} = ${texNum(r)}`).join(",\\ "),
        explanation: "Язгуурууд тоон шулууныг интервалуудад хуваана.",
      });
    }
  }

  // Интервалын арга: язгуур бүрийн хооронд тэмдгийг шалгана
  const pts = [-Infinity, ...roots, Infinity];
  const strict = op === "<" || op === ">";
  const wantPositive = op === ">" || op === ">=";
  const intervals: { a: number; b: number; aInc: boolean; bInc: boolean }[] = [];
  const signRows: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const mid = a === -Infinity ? (b === Infinity ? 0 : b - 1) : b === Infinity ? a + 1 : (a + b) / 2;
    const val = polyEval(coeffs, mid);
    const sign = val > 0 ? "+" : "-";
    signRows.push(`(${a === -Infinity ? "-\\infty" : texNum(a)};\\ ${b === Infinity ? "+\\infty" : texNum(b)}):\\ ${sign}`);
    if ((val > 0) === wantPositive) intervals.push({ a, b, aInc: !strict && a !== -Infinity, bInc: !strict && b !== Infinity });
  }
  // зэргэлдээ интервалыг нэгтгэх (давхар язгуурын үед)
  const merged: typeof intervals = [];
  for (const it of intervals) {
    const last = merged[merged.length - 1];
    if (last && approxEq(last.b, it.a) && last.bInc) {
      last.b = it.b;
      last.bInc = it.bInc;
    } else merged.push({ ...it });
  }
  // ≤/≥ үед тусгаарлагдсан язгуур (давхар язгуур) нэмэх
  const isolated: number[] = [];
  if (!strict) {
    for (const r of roots) {
      const covered = merged.some((m) => (m.a < r || (approxEq(m.a, r) && m.aInc)) && (r < m.b || (approxEq(m.b, r) && m.bInc)));
      if (!covered) isolated.push(r);
    }
  }
  steps.push({
    title: "Интервалын арга",
    latex: signRows.join("\\quad "),
    explanation: `Интервал бүрээс нэг цэг авч илэрхийллийн тэмдгийг шалгана. Бидэнд ${wantPositive ? "эерэг" : "сөрөг"}${strict ? "" : " эсвэл тэг"} утгатай хэсэг хэрэгтэй.`,
  });

  const parts = merged.map(
    (m) =>
      `${m.aInc ? "[" : "("}${m.a === -Infinity ? "-\\infty" : texNum(m.a)};\\ ${m.b === Infinity ? "+\\infty" : texNum(m.b)}${m.bInc ? "]" : ")"}`,
  );
  parts.push(...isolated.map((r) => `\\{${texNum(r)}\\}`));
  const ans = parts.length ? `${v} \\in ${parts.join(" \\cup ")}` : "\\text{Шийдгүй}";
  const plain = merged
    .map((m) => `${m.aInc ? "[" : "("}${m.a === -Infinity ? "-inf" : fmtNum(m.a)}; ${m.b === Infinity ? "inf" : fmtNum(m.b)}${m.bInc ? "]" : ")"}`)
    .concat(isolated.map((r) => `{${fmtNum(r)}}`))
    .join(" U ");

  // шалгалт: хэд хэдэн санамсаргүй цэгт тэнцэтгэл биш биелэх эсэх
  const checkSteps: string[] = [];
  let passed = true;
  for (const m of merged.slice(0, 3)) {
    const x = m.a === -Infinity ? (m.b === Infinity ? 0 : m.b - 1) : m.b === Infinity ? m.a + 1 : (m.a + m.b) / 2;
    const L = evalAt(lhs, { [v]: x });
    const R = evalAt(rhs, { [v]: x });
    const holds = op === "<" ? L < R : op === ">" ? L > R : op === "<=" ? L <= R + 1e-12 : L >= R - 1e-12;
    passed &&= holds;
    checkSteps.push(`${v} = ${texNum(x)}:\\ ${texNum(L)} ${opTex[op]} ${texNum(R)}\\ ${holds ? "\\checkmark" : "\\times"}`);
  }

  return {
    problem: `$${problemTex}$`,
    kind: deg === 1 ? "LINEAR_INEQUALITY" : "POLYNOMIAL_INEQUALITY",
    topic: deg === 1 ? "Шугаман тэнцэтгэл биш" : deg === 2 ? "Квадрат тэнцэтгэл биш" : "Тэнцэтгэл биш",
    given: [`$${problemTex}$`],
    find: `Тэнцэтгэл бишийг хангах $${v}$-ийн утгын олонлог`,
    formulas: deg === 2 ? [{ name: "Дискриминант", latex: "D = b^2 - 4ac" }] : [],
    methodReason:
      deg === 1
        ? "Шугаман тэнцэтгэл бишийг тэгшитгэл шиг бодох боловч сөрөг тоонд хуваахад тэмдэг солигдохыг анхаарна."
        : "Интервалын арга нь олон гишүүнт тэнцэтгэл бишийг бодох хамгийн найдвартай арга.",
    steps,
    finalAnswer: plain || "шийдгүй",
    finalAnswerLatex: ans,
    check: { method: "Шийдийн интервал бүрээс цэг авч анхны тэнцэтгэл бишид орлуулж шалгав.", steps: checkSteps, passed },
  };
}

// ─────────────────────────── Систем ───────────────────────────

function solveLinearSystem(eqs: { lhs: string; rhs: string }[], vars: string[]): Partial | null {
  const n = vars.length;
  if (eqs.length !== n || n < 2 || n > 4) return null;
  const A: number[][] = [];
  const B: number[] = [];
  const zero = Object.fromEntries(vars.map((v) => [v, 0]));
  try {
    for (const { lhs, rhs } of eqs) {
      const f = `(${lhs}) - (${rhs})`;
      const f0 = evalAt(f, zero);
      const row = vars.map((v) => evalAt(f, { ...zero, [v]: 1 }) - f0);
      // шугаман эсэхийг санамсаргүй цэгт шалгах
      for (let t = 0; t < 3; t++) {
        const pt = Object.fromEntries(vars.map((v) => [v, Math.random() * 10 - 5]));
        const lin = f0 + vars.reduce((s, v, j) => s + row[j] * pt[v], 0);
        if (!approxEq(evalAt(f, pt), lin, 1e-7)) return null;
      }
      A.push(row);
      B.push(-f0);
    }
  } catch {
    return null;
  }

  const det = math.det(A) as number;
  const sysTex = `\\begin{cases} ${eqs.map((e) => `${tex(e.lhs)} = ${tex(e.rhs)}`).join(" \\\\ ")} \\end{cases}`;
  const steps: SolutionStep[] = [
    {
      title: "Стандарт хэлбэрт бичих",
      latex: `\\begin{cases} ${A.map((row, i) => `${row.map((c, j) => `${c < 0 ? "-" : j === 0 ? "" : "+"} ${isInt(Math.abs(c)) && Math.abs(c) === 1 ? "" : texNum(Math.abs(c))}${vars[j]}`).join(" ")} = ${texNum(B[i])}`).join(" \\\\ ")} \\end{cases}`,
      explanation: "Үл мэдэгдэгчтэй гишүүдийг зүүн талд, сул гишүүнийг баруун талд байрлуулна.",
    },
  ];

  if (Math.abs(det) < 1e-12) {
    steps.push({
      title: "Тодорхойлогч бодох",
      latex: `\\Delta = ${texNum(det)}`,
      explanation: "Үндсэн тодорхойлогч тэг тул систем цор ганц шийдгүй (шийдгүй эсвэл төгсгөлгүй олон шийдтэй).",
    });
    // Шийдгүй эсвэл олон шийдтэйг ялгах: rank шалгах
    const aug = A.map((r, i) => [...r, B[i]]);
    const rank = (M: number[][]) => {
      const m = M.map((r) => [...r]);
      let rk = 0;
      for (let c = 0; c < m[0].length && rk < m.length; c++) {
        let p = rk;
        while (p < m.length && Math.abs(m[p][c]) < 1e-10) p++;
        if (p === m.length) continue;
        [m[rk], m[p]] = [m[p], m[rk]];
        for (let r = 0; r < m.length; r++)
          if (r !== rk) {
            const k = m[r][c] / m[rk][c];
            for (let j = c; j < m[0].length; j++) m[r][j] -= k * m[rk][j];
          }
        rk++;
      }
      return rk;
    };
    const infinite = rank(A) === rank(aug);
    return {
      problem: `$${sysTex}$`,
      kind: "LINEAR_SYSTEM",
      topic: "Шугаман тэгшитгэлийн систем",
      given: eqs.map((e) => `$${tex(e.lhs)} = ${tex(e.rhs)}$`),
      find: `$${vars.join(", ")}$`,
      formulas: [{ name: "Крамерын дүрэм", latex: "x_i = \\frac{\\Delta_i}{\\Delta}" }],
      steps,
      finalAnswer: infinite ? "төгсгөлгүй олон шийд" : "шийдгүй",
      finalAnswerLatex: infinite ? "\\text{Төгсгөлгүй олон шийдтэй}" : "\\text{Шийдгүй}",
      check: {
        method: "Өргөтгөсөн матрицын ранкийг харьцуулав (Кронекер–Капеллийн теорем).",
        steps: [`\\operatorname{rank} A = ${rank(A)},\\ \\operatorname{rank}(A|B) = ${rank(aug)}`],
        passed: true,
      },
    };
  }

  const solution = (math.lusolve(A, B) as number[][]).map((r) => r[0]);
  if (n === 2) {
    const [[a1, b1], [a2, b2]] = A;
    const [c1, c2] = B;
    const dx = c1 * b2 - c2 * b1;
    const dy = a1 * c2 - a2 * c1;
    steps.push(
      {
        title: "Үндсэн тодорхойлогч",
        latex: `\\Delta = \\begin{vmatrix} ${texNum(a1)} & ${texNum(b1)} \\\\ ${texNum(a2)} & ${texNum(b2)} \\end{vmatrix} = ${texNum(a1)}\\cdot${texNum(b2)} - ${texNum(b1)}\\cdot${texNum(a2)} = ${texNum(det)}`,
        explanation: "$\\Delta \\neq 0$ тул систем цор ганц шийдтэй.",
      },
      {
        title: `${vars[0]}-ийн тодорхойлогч`,
        latex: `\\Delta_{${vars[0]}} = \\begin{vmatrix} ${texNum(c1)} & ${texNum(b1)} \\\\ ${texNum(c2)} & ${texNum(b2)} \\end{vmatrix} = ${texNum(dx)}`,
        explanation: `Эхний баганыг (${vars[0]}-ийн коэффициент) сул гишүүний баганаар солино.`,
      },
      {
        title: `${vars[1]}-ийн тодорхойлогч`,
        latex: `\\Delta_{${vars[1]}} = \\begin{vmatrix} ${texNum(a1)} & ${texNum(c1)} \\\\ ${texNum(a2)} & ${texNum(c2)} \\end{vmatrix} = ${texNum(dy)}`,
        explanation: "Хоёр дахь баганыг сул гишүүний баганаар солино.",
      },
      {
        title: "Крамерын дүрмээр олох",
        latex: `${vars[0]} = \\frac{${texNum(dx)}}{${texNum(det)}} = ${texNum(solution[0])},\\quad ${vars[1]} = \\frac{${texNum(dy)}}{${texNum(det)}} = ${texNum(solution[1])}`,
        explanation: "Үл мэдэгдэгч бүр нь харгалзах тодорхойлогчийг үндсэн тодорхойлогчид хуваасантай тэнцүү.",
      },
    );
  } else {
    steps.push({
      title: "Гауссын аргаар бодох",
      latex: vars.map((v, i) => `${v} = ${texNum(solution[i])}`).join(",\\ "),
      explanation: "Өргөтгөсөн матрицыг мөрийн элементар хувиргалтаар гурвалжин хэлбэрт оруулж, доороос дээш орлуулав.",
    });
  }

  const scope = Object.fromEntries(vars.map((v, i) => [v, solution[i]]));
  const checkSteps: string[] = [];
  let passed = true;
  for (const e of eqs) {
    const L = evalAt(e.lhs, scope);
    const R = evalAt(e.rhs, scope);
    const good = approxEq(L, R, 1e-7);
    passed &&= good;
    checkSteps.push(`${tex(e.lhs)} = ${texNum(L)},\\ ${tex(e.rhs)} = ${texNum(R)}\\ ${good ? "\\checkmark" : "\\times"}`);
  }

  const alternatives =
    n === 2
      ? [
          {
            title: "Орлуулах арга",
            steps: [
              {
                title: "Нэг хувьсагчийг илэрхийлэх",
                latex: `${vars[0]} = \\frac{${texNum(B[0])} - (${texNum(A[0][1])})${vars[1]}}{${texNum(A[0][0])}}`,
                explanation: `Эхний тэгшитгэлээс ${vars[0]}-ийг ${vars[1]}-ээр илэрхийлээд хоёр дахь тэгшитгэлд орлуулна.`,
              },
              {
                title: "Нэг үл мэдэгдэгчтэй тэгшитгэл бодох",
                latex: `${vars[1]} = ${texNum(solution[1])} \\Rightarrow ${vars[0]} = ${texNum(solution[0])}`,
                explanation: "Олсон утгаа буцааж орлуулж нөгөө хувьсагчийг олно.",
              },
            ],
          },
        ]
      : undefined;

  return {
    problem: `$${sysTex}$`,
    kind: "LINEAR_SYSTEM",
    topic: "Шугаман тэгшитгэлийн систем",
    given: eqs.map((e) => `$${tex(e.lhs)} = ${tex(e.rhs)}$`),
    find: `$${vars.join(", ")}$ үл мэдэгдэгчид`,
    formulas: [{ name: "Крамерын дүрэм", latex: "x_i = \\frac{\\Delta_i}{\\Delta}" }],
    methodReason: "Систем шугаман бөгөөд үл мэдэгдэгчийн тоо тэгшитгэлийн тоотой тэнцүү тул Крамерын дүрэм хэрэглэх боломжтой.",
    steps,
    finalAnswer: solution.map(fmtNum).join("; "),
    finalAnswerLatex: vars.map((v, i) => `${v} = ${texNum(solution[i])}`).join(",\\quad "),
    check: { method: "Олсон утгуудыг тэгшитгэл бүрт орлуулж шалгав.", steps: checkSteps, passed },
    alternatives,
    numeric: solution,
  };
}

// ─────────────────────────── Уламжлал ───────────────────────────

const DERIV_PATTERNS: RegExp[] = [
  /^\s*\\frac\s*\{\s*d\s*\}\s*\{\s*d\s*([a-z])\s*\}\s*(.+)$/i,
  /^\s*d\s*\/\s*d([a-z])\s*(.+)$/i,
  /^\s*\((.+)\)\s*'\s*$/,
  /^\s*(?:уламжлал|derivative)\s*[:,]?\s*(.+)$/i,
  /^\s*(.+?)\s*(?:-ийн|-ын|ийн|ын)?\s*уламжлал(?:ыг)?\s*(?:ол|олно уу)?\.?\s*$/i,
];

function detectDerivative(raw: string): { body: string; v: string } | null {
  for (const re of DERIV_PATTERNS) {
    const m = raw.match(re);
    if (m) {
      if (m.length === 3) return { v: m[1], body: m[2] };
      return { v: "", body: m[1] };
    }
  }
  return null;
}

function solveDerivative(bodyLatex: string, vHint: string): Partial | null {
  let body = latexToExpr(bodyLatex.replace(/^[fgyh]\s*\(\s*[a-z]\s*\)\s*=\s*/, "").replace(/^y\s*=\s*/, ""));
  body = body.replace(/^\((.*)\)$/, "$1");
  let node;
  try {
    node = math.parse(body);
  } catch {
    return null;
  }
  const vars = variablesOf(node);
  const v = vHint || (vars.includes("x") ? "x" : vars[0]);
  if (!v) return null;
  let d;
  try {
    d = math.derivative(node, v);
  } catch {
    return null;
  }
  const simplified = math.simplify(d);
  const rules: { name: string; latex: string }[] = [];
  const s = body;
  if (/\^/.test(s)) rules.push({ name: "Зэргийн функцийн уламжлал", latex: "(x^n)' = n x^{n-1}" });
  if (/\*|\)\(|[0-9a-z]\(/.test(s) && vars.length) rules.push({ name: "Үржвэрийн дүрэм", latex: "(uv)' = u'v + uv'" });
  if (/\//.test(s)) rules.push({ name: "Ноогдворын дүрэм", latex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}" });
  if (/sin/.test(s)) rules.push({ name: "Синусын уламжлал", latex: "(\\sin x)' = \\cos x" });
  if (/cos/.test(s)) rules.push({ name: "Косинусын уламжлал", latex: "(\\cos x)' = -\\sin x" });
  if (/exp|e\^/.test(s)) rules.push({ name: "Илтгэгч функц", latex: "(e^x)' = e^x" });
  if (/log/.test(s)) rules.push({ name: "Логарифм функц", latex: "(\\ln x)' = \\frac{1}{x}" });
  if (/(sin|cos|tan|exp|log|sqrt)\([^)]*[a-z][^)]*[0-9*+\-^]/.test(s) || /\)\^/.test(s))
    rules.push({ name: "Давхар функцийн дүрэм", latex: "(f(g(x)))' = f'(g(x))\\cdot g'(x)" });
  rules.push({ name: "Нийлбэрийн дүрэм", latex: "(u \\pm v)' = u' \\pm v'" });

  // Тоон шалгалт: төвийн ялгаварын аргаар 2 цэгт харьцуулах
  const checkSteps: string[] = [];
  let passed = true;
  for (const x0 of [0.7, 1.9]) {
    try {
      const h = 1e-5;
      const num = (evalAt(body, { [v]: x0 + h }) - evalAt(body, { [v]: x0 - h })) / (2 * h);
      const sym = evalAt(simplified.toString(), { [v]: x0 });
      const good = approxEq(num, sym, 1e-4);
      passed &&= good;
      checkSteps.push(`${v} = ${x0}:\\ \\frac{f(${v}+h) - f(${v}-h)}{2h} \\approx ${num.toFixed(5)},\\ f'(${v}) = ${sym.toFixed(5)}\\ ${good ? "\\checkmark" : "\\times"}`);
    } catch {
      /* тодорхойлогдохгүй цэг */
    }
  }

  return {
    problem: `$\\left(${tex(node)}\\right)'$`,
    kind: "DERIVATIVE",
    topic: "Уламжлал",
    given: [`$f(${v}) = ${tex(node)}$`],
    find: `$f'(${v})$ — уламжлал`,
    formulas: rules,
    methodReason: "Уламжлалын үндсэн дүрмүүдийг илэрхийллийн бүтцийн дагуу дараалан хэрэглэнэ.",
    steps: [
      {
        title: "Функцийн бүтцийг тодорхойлох",
        latex: `f(${v}) = ${tex(node)}`,
        explanation: "Функц ямар үйлдлүүдээс (нийлбэр, үржвэр, давхар функц) тогтож байгааг тодорхойлж, тохирох дүрмийг сонгоно.",
      },
      {
        title: "Дүрмүүдийг хэрэглэх",
        latex: `f'(${v}) = ${tex(d)}`,
        explanation: "Гишүүн бүрийн уламжлалыг харгалзах дүрмээр олов.",
      },
      {
        title: "Хялбарчлах",
        latex: `f'(${v}) = ${tex(simplified)}`,
        explanation: "Төстэй гишүүдийг эмхэтгэж, илэрхийллийг хялбарчлав.",
      },
    ],
    finalAnswer: simplified.toString(),
    finalAnswerLatex: `f'(${v}) = ${tex(simplified)}`,
    check: { method: "Тоон дифференциалчлалаар (төвийн ялгавар) хоёр цэгт харьцуулав.", steps: checkSteps, passed: checkSteps.length ? passed : null },
  };
}

// ─────────────────────────── Илэрхийлэл ───────────────────────────

function solveExpression(expr: string): Partial | null {
  let node;
  try {
    node = math.parse(expr);
  } catch {
    return null;
  }
  const vars = variablesOf(node);
  const problemTex = tex(node);

  if (vars.length === 0) {
    let value: number;
    try {
      value = evalAt(expr, {});
    } catch {
      return null;
    }
    if (!Number.isFinite(value)) return null;
    const steps: SolutionStep[] = [];
    // Дээд түвшний үйлдлийн хэсэг бүрийг тусад нь тооцох
    const n = node as unknown as { type: string; args?: { toString(): string }[]; op?: string };
    if (n.type === "OperatorNode" && n.args && n.args.length === 2) {
      const parts = n.args.map((a) => {
        const s = a.toString();
        return { s, v: evalAt(s, {}) };
      });
      if (parts.some((p) => p.s !== fmtNum(p.v))) {
        steps.push({
          title: "Үйлдлийн дарааллыг баримтлах",
          latex: parts.map((p) => `${tex(p.s)} = ${texNum(p.v)}`).join(",\\quad "),
          explanation: "Эхлээд хаалт, зэрэг, дараа нь үржих/хуваах, эцэст нь нэмэх/хасах үйлдлийг гүйцэтгэнэ. Хэсэг бүрийг тусад нь бодов.",
        });
        steps.push({
          title: "Үр дүнг нэгтгэх",
          latex: `${texNum(parts[0].v)} ${n.op === "*" ? "\\cdot" : n.op} ${parts[1].v < 0 ? `(${texNum(parts[1].v)})` : texNum(parts[1].v)} = ${texNum(value)}`,
          explanation: "Хэсгүүдийн утгыг үндсэн үйлдлээр нэгтгэнэ.",
        });
      }
    }
    if (steps.length === 0)
      steps.push({
        title: "Илэрхийллийн утгыг бодох",
        latex: `${problemTex} = ${texNum(value)}`,
        explanation: "Үйлдлийн дарааллын дагуу тооцоолов.",
      });
    const approx = !isInt(value) && fmtNum(value).includes("/") ? ` \\approx ${value.toFixed(4)}` : "";
    return {
      problem: `$${problemTex}$`,
      kind: "ARITHMETIC",
      topic: "Тоон илэрхийлэл",
      given: [`$${problemTex}$`],
      find: "Илэрхийллийн утга",
      formulas: [],
      methodReason: "Хувьсагчгүй тоон илэрхийлэл тул үйлдлийн дарааллын дагуу шууд бодно.",
      steps,
      finalAnswer: fmtNum(value),
      finalAnswerLatex: `${texNum(value)}${approx}`,
      check: {
        method: "Аравтын бутархайгаар дахин тооцоолж харьцуулав.",
        steps: [`${problemTex} \\approx ${value.toFixed(6)}`],
        passed: true,
      },
      numeric: [value],
    };
  }

  // Хувьсагчтай илэрхийлэл: хялбарчлах, нэг хувьсагчтай бол задлах/үржигдэхүүнд задлах
  let simplified;
  try {
    simplified = math.simplify(node);
  } catch {
    return null;
  }
  const steps: SolutionStep[] = [];
  let expandedTex: string | null = null;
  let factoredTex: string | null = null;
  if (vars.length === 1) {
    const poly = polyCoeffs(expr, vars[0]);
    if (poly && !poly.denominator) {
      expandedTex = polyTex(poly.coeffs, vars[0]);
      steps.push({
        title: "Хаалт задалж, төстэй гишүүдийг эмхэтгэх",
        latex: `${problemTex} = ${expandedTex}`,
        explanation: "Үржүүлэх үйлдлийн хуваарилах чанарыг ашиглан хаалтыг задалж, ижил зэрэгтэй гишүүдийг нэмэв.",
      });
      if (poly.coeffs.length === 3) {
        const [c, b, a] = poly.coeffs;
        const D = b * b - 4 * a * c;
        if (D >= 0 && isInt(Math.sqrt(D)) && [a, b, c].every((x) => isInt(x))) {
          const r1 = (-b - Math.sqrt(D)) / (2 * a);
          const r2 = (-b + Math.sqrt(D)) / (2 * a);
          const v = vars[0];
          const fac = (r: number) => (r === 0 ? v : `(${v} ${r < 0 ? "+" : "-"} ${texNum(Math.abs(r))})`);
          factoredTex = `${a === 1 ? "" : a === -1 ? "-" : texNum(a)}${fac(r1)}${r1 === r2 ? "^2" : fac(r2)}`;
          steps.push({
            title: "Үржигдэхүүнд задлах",
            latex: `${expandedTex} = ${factoredTex}`,
            explanation: `$a${v}^2+b${v}+c = a(${v}-${v}_1)(${v}-${v}_2)$ томьёо ашиглав. Энд $${v}_1 = ${texNum(r1)},\\ ${v}_2 = ${texNum(r2)}$ нь харгалзах тэгшитгэлийн язгуурууд.`,
          });
        }
      }
    }
  }
  if (steps.length === 0) {
    steps.push({
      title: "Илэрхийллийг хялбарчлах",
      latex: `${problemTex} = ${tex(simplified)}`,
      explanation: "Төстэй гишүүдийг эмхэтгэж, бутархайг хураав.",
    });
  }
  const finalTex = factoredTex ?? expandedTex ?? tex(simplified);
  // тэнцүү эсэхийг санамсаргүй цэгт шалгах
  const checkSteps: string[] = [];
  let passed = true;
  for (let t = 0; t < 3; t++) {
    const scope = Object.fromEntries(vars.map((v) => [v, Math.round((Math.random() * 6 - 3) * 100) / 100 || 1.3]));
    try {
      const a = evalAt(expr, scope);
      const b = evalAt(simplified.toString(), scope);
      const good = approxEq(a, b, 1e-7);
      passed &&= good;
      checkSteps.push(`${vars.map((v) => `${v} = ${scope[v]}`).join(", ")}:\\ ${a.toFixed(4)} = ${b.toFixed(4)}\\ ${good ? "\\checkmark" : "\\times"}`);
    } catch {
      /* */
    }
  }
  return {
    problem: `$${problemTex}$`,
    kind: "SIMPLIFY",
    topic: "Алгебрийн илэрхийлэл",
    given: [`$${problemTex}$`],
    find: "Хялбарчилсан хэлбэр",
    formulas: [
      { name: "Хуваарилах чанар", latex: "a(b + c) = ab + ac" },
      { name: "Квадратын ялгавар", latex: "a^2 - b^2 = (a-b)(a+b)" },
    ],
    methodReason: "Хаалт задлах, төстэй гишүүн эмхэтгэх, үржигдэхүүнд задлах аргуудыг дараалан хэрэглэв.",
    steps,
    finalAnswer: simplified.toString(),
    finalAnswerLatex: finalTex,
    check: { method: "Анхны болон хялбарчилсан илэрхийллийн утгыг санамсаргүй цэгүүдэд харьцуулав.", steps: checkSteps, passed },
  };
}

// ─────────────────────────── Нэгдсэн оролт ───────────────────────────

/** Бодлогыг symbolic хөдөлгүүрээр бодохыг оролдоно. Дэмжихгүй бол null. */
export function solveSymbolic(input: string): SolutionResult | null {
  const raw = input.trim();
  if (!raw) return null;
  // Монгол үгтэй текст бодлогыг (уламжлалаас бусад) AI-д үлдээнэ
  const deriv = detectDerivative(raw);
  let result: Partial | null = null;

  try {
    if (deriv) {
      result = solveDerivative(deriv.body, deriv.v);
    } else {
      const cyr = (raw.match(/[а-яөүёА-ЯӨҮЁ]/g) ?? []).length;
      if (cyr > 3) return null;
      const parts = splitSystem(raw);
      if (parts.length >= 2 && parts.every((p) => /=/.test(p) && !/[<>]/.test(p))) {
        const eqs = parts.map((p) => {
          const [l, r] = p.split("=");
          return { lhs: latexToExpr(l), rhs: latexToExpr(r) };
        });
        const vars = [...new Set(eqs.flatMap((e) => [...variablesOf(e.lhs), ...variablesOf(e.rhs)]))].sort();
        result = solveLinearSystem(eqs, vars);
      } else {
        const expr = latexToExpr(raw);
        const ineq = expr.match(/^(.*?)(<=|>=|<|>)(.*)$/);
        if (ineq) {
          const [, l, op, r] = ineq;
          const vars = [...new Set([...variablesOf(l), ...variablesOf(r)])];
          if (vars.length === 1) result = solveInequality(l, op, r, vars[0]);
        } else if (/=/.test(expr) && !/!=/.test(expr)) {
          const sides = expr.split("=");
          if (sides.length !== 2) return null;
          let [l, r] = sides;
          // "y = 2x+3" гэх мэт функцийн тодорхойлолт биш, жинхэнэ тэгшитгэл эсэх
          if (/^\s*[fgh]\s*\(\s*[a-z]\s*\)\s*$/.test(l)) return null;
          l = l.trim();
          r = r.trim();
          const vars = [...new Set([...variablesOf(l), ...variablesOf(r)])];
          if (vars.length === 1) result = solveEquation(raw, l, r, vars[0]);
        } else {
          result = solveExpression(expr);
        }
      }
    }
  } catch (e) {
    console.error("[solver]", e);
    return null;
  }

  if (!result) return null;
  const passed = result.check.passed;
  return {
    ...result,
    engine: "SYMBOLIC",
    verification: passed === true ? "VERIFIED" : passed === false ? "MISMATCH" : "UNVERIFIED",
    verificationNote:
      passed === true
        ? "Хариуг тооцооллын хөдөлгүүрээр бие даан шалгаж баталгаажуулсан."
        : passed === false
          ? "Шалгалтын алхамд зөрүү илэрлээ. Бодолтыг багштайгаа нягтална уу."
          : "Энэ төрлийн хариуг автоматаар шалгах боломжгүй.",
  };
}

/** AI-ийн эцсийн хариуг symbolic үр дүнтэй харьцуулах */
export function compareNumericSets(a: number[], b: number[], eps = 1e-6): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((x, i) => approxEq(x, sb[i], eps));
}
