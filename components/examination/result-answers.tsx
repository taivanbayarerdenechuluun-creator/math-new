"use client";
import * as React from "react";
import { CheckCircle2, ChevronDown, Clock, MinusCircle, XCircle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { MathText, Tex } from "@/components/mathematics/math-text";
import { cn } from "@/lib/utils";

interface Answer {
  id: string;
  answer: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  feedback: string | null;
  question: {
    text: string;
    type: string;
    correctAnswer: string | null;
    explanation: string | null;
    options: { label: string; text: string; isCorrect: boolean }[];
    solutions: { steps: string; isVerified: boolean }[];
  };
}

export function ResultAnswers({ answers }: { answers: Answer[] }) {
  const [open, setOpen] = React.useState<string | null>(null);
  return (
    <Card>
      <CardHeader title="Дэлгэрэнгүй бодолт" description="Асуулт бүрийн хариу ба тайлбар" />
      <CardBody className="space-y-2">
        {answers.map((a, i) => {
          const empty = !a.answer?.trim();
          const status = a.isCorrect === null ? "pending" : a.isCorrect ? "ok" : empty ? "empty" : "bad";
          const steps = (() => {
            try {
              const s = a.question.solutions.find((x) => x.isVerified) ?? a.question.solutions[0];
              return s ? (JSON.parse(s.steps) as { title: string; latex?: string; explanation: string }[]) : [];
            } catch {
              return [];
            }
          })();
          const correctLabel = a.question.options.find((o) => o.isCorrect)?.label ?? a.question.correctAnswer;
          return (
            <div key={a.id} className="rounded-xl border border-border">
              <button onClick={() => setOpen(open === a.id ? null : a.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open === a.id}>
                {status === "ok" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : status === "bad" ? <XCircle className="h-5 w-5 shrink-0 text-danger" /> : status === "empty" ? <MinusCircle className="h-5 w-5 shrink-0 text-subtle" /> : <Clock className="h-5 w-5 shrink-0 text-info" />}
                <span className="shrink-0 text-sm font-semibold text-muted">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  <MathText text={a.question.text} inline />
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-subtle transition-transform", open === a.id && "rotate-180")} />
              </button>
              {open === a.id && (
                <div className="space-y-3 border-t border-border px-4 py-4 text-sm">
                  <MathText text={a.question.text} />
                  {a.question.options.length > 0 && (
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {a.question.options.map((o) => (
                        <li key={o.label} className={cn("rounded-lg px-3 py-2", o.isCorrect ? "bg-success-soft" : a.answer === o.label ? "bg-danger-soft" : "bg-surface-2/60")}>
                          <b>{o.label})</b> <MathText text={o.text} inline />
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <p>
                      Таны хариу: <b>{empty ? "—" : a.question.type === "EXPRESSION" ? <Tex tex={a.answer!} /> : a.answer}</b>
                    </p>
                    {a.question.type !== "OPEN" && correctLabel && (
                      <p>
                        Зөв хариу: <b className="text-success">{a.question.type === "MULTIPLE_CHOICE" ? correctLabel : <Tex tex={correctLabel.replace(/\*pi/g, "\\pi")} />}</b>
                      </p>
                    )}
                    {a.pointsAwarded !== null && <p>Оноо: <b>{a.pointsAwarded}</b></p>}
                  </div>
                  {a.feedback && <p className="rounded-lg bg-info-soft px-3 py-2">Багшийн тайлбар: {a.feedback}</p>}
                  {a.question.explanation && (
                    <div className="rounded-lg bg-surface-2/60 px-3 py-2">
                      <MathText text={a.question.explanation} />
                    </div>
                  )}
                  {steps.length > 0 && (
                    <ol className="space-y-2">
                      {steps.map((s, k) => (
                        <li key={k}>
                          <p className="font-semibold">{k + 1}. {s.title}</p>
                          {s.latex && <Tex tex={s.latex} display />}
                          <p className="text-muted">{s.explanation}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
