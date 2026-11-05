"use client";
// Нүүр хуудасны интерактив график: y = ax² + bx + c — гулсуураар коэффициентыг өөрчилнө.
import * as React from "react";
import { Tex } from "@/components/mathematics/math-text";

export function ParabolaPlayground() {
  const [a, setA] = React.useState(1);
  const [b, setB] = React.useState(-2);
  const [c, setC] = React.useState(-3);
  const W = 320;
  const H = 240;
  const scale = 20; // 1 нэгж = 20px
  const ox = W / 2;
  const oy = H / 2;
  const pts: string[] = [];
  for (let px = 0; px <= W; px += 2) {
    const x = (px - ox) / scale;
    const y = a * x * x + b * x + c;
    const py = oy - y * scale;
    if (py > -50 && py < H + 50) pts.push(`${px},${py.toFixed(1)}`);
  }
  const D = b * b - 4 * a * c;
  const roots = a !== 0 && D >= 0 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)] : [];
  const vx = a !== 0 ? -b / (2 * a) : 0;
  const vy = a * vx * vx + b * vx + c;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  const lead = a === 1 ? "" : a === -1 ? "-" : fmt(a);
  const term = (n: number, v: string) => (n === 0 ? "" : ` ${n < 0 ? "-" : "+"} ${Math.abs(n) === 1 && v ? "" : fmt(Math.abs(n))}${v}`);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between text-white">
        <Tex tex={a === 0 ? `y =${term(b, "x") || " 0"}${term(c, "")}` : `y = ${lead}x^2${term(b, "x")}${term(c, "")}`} />
        <span className="text-xs text-white/50">D = {fmt(D)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`y = ${a}x² + ${b}x + ${c} функцийн график`}>
        {Array.from({ length: W / scale + 1 }, (_, i) => (
          <line key={`v${i}`} x1={i * scale} y1={0} x2={i * scale} y2={H} stroke="rgba(255,255,255,0.06)" />
        ))}
        {Array.from({ length: H / scale + 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * scale} x2={W} y2={i * scale} stroke="rgba(255,255,255,0.06)" />
        ))}
        <line x1={0} y1={oy} x2={W} y2={oy} stroke="rgba(255,255,255,0.35)" />
        <line x1={ox} y1={0} x2={ox} y2={H} stroke="rgba(255,255,255,0.35)" />
        <polyline points={pts.join(" ")} fill="none" stroke="#9d8bff" strokeWidth={2.5} strokeLinecap="round" />
        {roots.map((r, i) => (
          <circle key={i} cx={ox + r * scale} cy={oy} r={5} fill="#2fd0ec" stroke="#0b1030" strokeWidth={2} />
        ))}
        {a !== 0 && <circle cx={ox + vx * scale} cy={oy - vy * scale} r={5} fill="#ffb547" stroke="#0b1030" strokeWidth={2} />}
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-white/70">
        {[
          ["a", a, setA, -3, 3],
          ["b", b, setB, -6, 6],
          ["c", c, setC, -6, 6],
        ].map(([label, val, set, min, max]) => (
          <label key={label as string} className="space-y-1">
            <span className="flex justify-between">
              <span className="font-semibold">{label as string}</span>
              <span>{fmt(val as number)}</span>
            </span>
            <input
              type="range"
              min={min as number}
              max={max as number}
              step={0.5}
              value={val as number}
              onChange={(e) => (set as (n: number) => void)(Number(e.target.value))}
              className="w-full accent-[#9d8bff]"
              aria-label={`${label} коэффициент`}
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-white/60">
        {a === 0 ? "a = 0 үед шугаман функц болно." : roots.length === 2 ? `Язгуур: x₁ = ${fmt(roots[0])}, x₂ = ${fmt(roots[1])} · Орой (${fmt(vx)}; ${fmt(vy)})` : `Бодит язгуургүй (D < 0) · Орой (${fmt(vx)}; ${fmt(vy)})`}
      </p>
    </div>
  );
}
