"use client";
import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bookmark, Bot, CheckCircle2, Lightbulb, RotateCcw, Trophy, XCircle } from "lucide-react";
import { Badge, Button, Card, CardBody, DIFFICULTY_TONE, Input, Progress } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { MathEditor } from "@/components/mathematics/math-editor";
import { MathText, Tex } from "@/components/mathematics/math-text";
import { api } from "@/lib/client";
import { DIFFICULTY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface PracticeQuestion {
  id: string;
  code: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "NUMERIC" | "EXPRESSION";
  difficulty: number;
  options: { label: string; text: string }[];
  topic: string | null;
  saved: boolean;
  lastResult: boolean | null;
}

interface Feedback {
  isCorrect: boolean;
  correctAnswer: string | null;
  explanation: string | null;
  steps: { title: string; latex?: string; explanation: string }[];
  xp: number;
}

export function PracticeClient({ questions }: { questions: PracticeQuestion[] }) {
  const [i, setI] = React.useState(0);
  const [answer, setAnswer] = React.useState("");
  const [fb, setFb] = React.useState<Feedback | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [score, setScore] = React.useState({ correct: 0, total: 0, xp: 0 });
  const [saved, setSaved] = React.useState<Record<string, boolean>>(Object.fromEntries(questions.map((q) => [q.id, q.saved])));
  const started = React.useRef(Date.now());
  const toast = useToast();
  const q = questions[i];
  const done = i >= questions.length;

  const submit = async () => {
    if (!answer.trim()) return toast({ tone: "warning", title: "Хариултаа оруулна уу." });
    setBusy(true);
    try {
      const r = await api<Feedback & { achievements: { title: string }[] }>("/api/practice/answer", {
        method: "POST",
        json: { questionId: q.id, answer, timeSpentSec: Math.round((Date.now() - started.current) / 1000) },
      });
      setFb(r);
      setScore((s) => ({ correct: s.correct + (r.isCorrect ? 1 : 0), total: s.total + 1, xp: s.xp + r.xp }));
      r.achievements.forEach((a) => toast({ tone: "info", title: `🏆 Шинэ амжилт: ${a.title}` }));
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    setI(i + 1);
    setAnswer("");
    setFb(null);
    started.current = Date.now();
  };

  const toggleSave = async () => {
    const on = !saved[q.id];
    try {
      await api("/api/saved", { method: on ? "POST" : "DELETE", json: { questionId: q.id } });
      setSaved({ ...saved, [q.id]: on });
      toast({ tone: "success", title: on ? "Хадгаллаа" : "Хадгалснаас хаслаа" });
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    }
  };

  if (done) {
    const pctv = Math.round((score.correct / Math.max(1, score.total)) * 100);
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Trophy className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold">Дасгал дууслаа!</h2>
        <p className="mt-2 text-muted">
          {score.total} бодлогоос {score.correct}-ийг зөв бодлоо ({pctv}%) · +{score.xp} XP
        </p>
        <p className="mt-1 text-sm text-muted">{pctv >= 80 ? "Маш сайн! Илүү хүнд түвшинг туршаад үзээрэй." : pctv >= 50 ? "Сайн байна. Алдсан бодлогуудаа дахин давтаарай." : "Онолоо дахин давтаад дасгалаа үргэлжлүүлээрэй."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" /> Дахин ажиллах
          </Button>
          <Link href="/student/progress" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-surface-2">
            Ахицаа харах
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={(i / questions.length) * 100} className="flex-1" />
        <span className="shrink-0 text-sm font-semibold tabular-nums text-muted">
          {i + 1}/{questions.length}
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
          <Card>
            <CardBody className="space-y-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={DIFFICULTY_TONE[q.difficulty]}>{DIFFICULTY_LABELS[q.difficulty]}</Badge>
                  {q.topic && <Badge tone="neutral">{q.topic}</Badge>}
                  {q.lastResult === false && <Badge tone="warning">Өмнө нь алдсан</Badge>}
                </div>
                <button onClick={toggleSave} className={cn("rounded-lg p-2 hover:bg-surface-2", saved[q.id] ? "text-primary" : "text-subtle")} aria-label="Хадгалах" aria-pressed={saved[q.id]}>
                  <Bookmark className={cn("h-5 w-5", saved[q.id] && "fill-current")} />
                </button>
              </div>
              <MathText text={q.text} className="text-lg" />

              {q.type === "MULTIPLE_CHOICE" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((o) => {
                    const chosen = answer === o.label;
                    const isRight = fb && fb.correctAnswer === o.label;
                    const isWrongPick = fb && chosen && !fb.isCorrect;
                    return (
                      <button
                        key={o.label}
                        disabled={Boolean(fb)}
                        onClick={() => setAnswer(o.label)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
                          isRight ? "border-success bg-success-soft" : isWrongPick ? "border-danger bg-danger-soft" : chosen ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong",
                        )}
                        aria-pressed={chosen}
                      >
                        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold", chosen || isRight ? "bg-primary text-white" : "bg-surface-2 text-muted", isRight && "bg-success", isWrongPick && "bg-danger")}>{o.label}</span>
                        <MathText text={o.text} inline />
                      </button>
                    );
                  })}
                </div>
              ) : q.type === "EXPRESSION" ? (
                <div>
                  <MathEditor value={answer} onChange={setAnswer} placeholder="Хариугаа бичнэ үү" />
                </div>
              ) : (
                <div className="max-w-sm">
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !fb && submit()}
                    placeholder="Хариу (жишээ нь 12, 3/4, 2,5 эсвэл 2; 3)"
                    disabled={Boolean(fb)}
                    inputMode="text"
                    aria-label="Хариу"
                  />
                  <p className="mt-1.5 text-xs text-subtle">Олон утга бол цэг таслалаар (;) тусгаарлана. Бутархайг 3/4 хэлбэрээр бичиж болно.</p>
                </div>
              )}

              {fb && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-2xl border p-4", fb.isCorrect ? "border-success/30 bg-success-soft" : "border-danger/30 bg-danger-soft")}>
                  <p className={cn("flex items-center gap-2 font-semibold", fb.isCorrect ? "text-success" : "text-danger")}>
                    {fb.isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    {fb.isCorrect ? `Зөв! +${fb.xp} XP` : "Буруу байна"}
                  </p>
                  {!fb.isCorrect && fb.correctAnswer && q.type !== "MULTIPLE_CHOICE" && (
                    <p className="mt-2 text-sm text-fg">
                      Зөв хариу: <Tex tex={fb.correctAnswer.replace(/\*pi/g, "\\pi").replace(/\*/g, "\\cdot ")} />
                    </p>
                  )}
                  {fb.explanation && (
                    <div className="mt-3 flex gap-2 text-sm text-fg">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <MathText text={fb.explanation} />
                    </div>
                  )}
                  {fb.steps.length > 0 && (
                    <ol className="mt-3 space-y-2 border-t border-border/60 pt-3 text-sm">
                      {fb.steps.map((s, k) => (
                        <li key={k}>
                          <p className="font-semibold">
                            {k + 1}. {s.title}
                          </p>
                          {s.latex && <Tex tex={s.latex} display />}
                          <p className="text-muted">{s.explanation}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </motion.div>
              )}

              <div className="flex flex-wrap justify-between gap-2">
                <Link href={`/student/tutor?problem=${encodeURIComponent(q.text)}`} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg">
                  <Bot className="h-4 w-4" /> Сануулга авах
                </Link>
                {fb ? (
                  <Button onClick={next}>
                    {i + 1 < questions.length ? "Дараагийн бодлого" : "Дүн харах"} <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={submit} loading={busy}>
                    Шалгах
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
