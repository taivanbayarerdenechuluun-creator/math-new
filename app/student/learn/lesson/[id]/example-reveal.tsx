"use client";
import * as React from "react";
import { Eye } from "lucide-react";
import { MathText } from "@/components/mathematics/math-text";

export function ExampleReveal({ n, problem, solution }: { n: number; problem: string; solution: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{n}</span>
        <MathText text={problem} className="min-w-0 flex-1" />
      </div>
      {open ? (
        <div className="mt-3 rounded-lg bg-success-soft px-4 py-2.5">
          <MathText text={solution} />
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <Eye className="h-4 w-4" /> Бодолтыг харах
        </button>
      )}
    </div>
  );
}
