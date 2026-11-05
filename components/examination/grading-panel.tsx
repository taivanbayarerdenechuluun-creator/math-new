"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { MathText } from "@/components/mathematics/math-text";
import { api } from "@/lib/client";

interface Item { id: string; student: string; question: string; reference: string | null; answer: string; max: number }

export function GradingPanel({ items }: { items: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [vals, setVals] = React.useState<Record<string, { points: string; feedback: string }>>({});
  const [busy, setBusy] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      {items.map((it) => {
        const v = vals[it.id] ?? { points: "", feedback: "" };
        return (
          <div key={it.id} className="space-y-3 rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">{it.student}</p>
            <div className="rounded-lg bg-surface-2/50 px-3 py-2 text-sm"><MathText text={it.question} /></div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-subtle">Сурагчийн бодолт</p>
                <div className="min-h-16 rounded-lg border border-border px-3 py-2 text-sm">{it.answer ? <MathText text={it.answer} /> : <span className="text-subtle">(хоосон)</span>}</div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-subtle">Жишиг бодолт</p>
                <div className="min-h-16 rounded-lg bg-success-soft/50 px-3 py-2 text-sm">{it.reference ? <MathText text={it.reference} /> : "—"}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-muted">
                Оноо (0–{it.max})
                <Input type="number" min={0} max={it.max} step={0.5} value={v.points} onChange={(e) => setVals({ ...vals, [it.id]: { ...v, points: e.target.value } })} className="mt-1 h-9 w-24" />
              </label>
              <label className="min-w-48 flex-1 text-xs text-muted">
                Тайлбар (сурагчид харагдана)
                <Input value={v.feedback} onChange={(e) => setVals({ ...vals, [it.id]: { ...v, feedback: e.target.value } })} className="mt-1 h-9" />
              </label>
              <Button
                size="sm"
                loading={busy === it.id}
                disabled={v.points === ""}
                onClick={async () => {
                  setBusy(it.id);
                  try {
                    await api(`/api/admin/grading/${it.id}`, { method: "POST", json: { points: Number(v.points), feedback: v.feedback } });
                    toast({ tone: "success", title: "Үнэлгээ хадгалагдлаа" });
                    router.refresh();
                  } catch (e) {
                    toast({ tone: "error", title: (e as Error).message });
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                <Check className="h-4 w-4" /> Үнэлэх
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
