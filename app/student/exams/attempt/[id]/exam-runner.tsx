"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, CloudOff, Flag, LayoutGrid, Loader2, Send, X } from "lucide-react";
import { Button, Card, CardBody, Input } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { MathEditor } from "@/components/mathematics/math-editor";
import { MathText } from "@/components/mathematics/math-text";
import { Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export interface ExamQuestion {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "NUMERIC" | "EXPRESSION" | "OPEN";
  options: { label: string; text: string }[];
  points: number;
}
type Entry = { answer: string; marked: boolean };

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamRunner({
  attemptId,
  title,
  deadline,
  serverNow,
  questions,
  saved,
}: {
  attemptId: string;
  title: string;
  deadline: number;
  serverNow: number;
  questions: ExamQuestion[];
  saved: Record<string, Entry>;
}) {
  const router = useRouter();
  const toast = useToast();
  const storageKey = `iqm-attempt-${attemptId}`;
  const offset = React.useRef(serverNow - Date.now());
  const [entries, setEntries] = React.useState<Record<string, Entry>>(saved);
  const [pending, setPending] = React.useState<Set<string>>(new Set());
  const [idx, setIdx] = React.useState(0);
  const [remaining, setRemaining] = React.useState(deadline - serverNow);
  const [confirm, setConfirm] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [gridOpen, setGridOpen] = React.useState(false);
  const [offline, setOffline] = React.useState(false);
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const entriesRef = React.useRef(entries);
  entriesRef.current = entries;
  const submittedRef = React.useRef(false);

  // Төхөөрөмж дээр хадгалагдсан (илгээгдээгүй) хариултуудыг сэргээх
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const local = JSON.parse(raw) as Record<string, Entry>;
        setEntries((e) => ({ ...e, ...local }));
        setPending(new Set(Object.keys(local)));
      }
    } catch {
      /* localStorage боломжгүй */
    }
  }, [storageKey]);

  const persistLocal = React.useCallback(
    (ids: Set<string>) => {
      try {
        if (ids.size === 0) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries([...ids].map((id) => [id, entriesRef.current[id]]))));
      } catch {
        /* */
      }
    },
    [storageKey],
  );

  const pushOne = React.useCallback(
    async (qid: string) => {
      const e = entriesRef.current[qid];
      if (!e) return;
      try {
        const res = await fetch(`/api/attempts/${attemptId}/answer`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: qid, answer: e.answer || null, marked: e.marked }),
        });
        if (res.status === 409) {
          submittedRef.current = true;
          toast({ tone: "warning", title: "Шалгалтын хугацаа дууссан тул илгээгдлээ." });
          router.replace(`/student/exams/result/${attemptId}`);
          return;
        }
        if (!res.ok) throw new Error();
        setOffline(false);
        setPending((p) => {
          const n = new Set(p);
          // хадгалж байх хооронд дахин өөрчлөгдөөгүй бол л цэвэрлэнэ
          if (entriesRef.current[qid] === e) n.delete(qid);
          persistLocal(n);
          return n;
        });
      } catch {
        setOffline(true);
      }
    },
    [attemptId, persistLocal, router, toast],
  );

  const update = (qid: string, patch: Partial<Entry>) => {
    setEntries((prev) => {
      const next = { ...prev, [qid]: { answer: prev[qid]?.answer ?? "", marked: prev[qid]?.marked ?? false, ...patch } };
      entriesRef.current = next;
      return next;
    });
    setPending((p) => {
      const n = new Set(p).add(qid);
      persistLocal(n);
      return n;
    });
    clearTimeout(timers.current[qid]);
    timers.current[qid] = setTimeout(() => pushOne(qid), 700);
  };

  // Сүлжээ сэргэхэд болон 5 секунд тутам дахин илгээх
  React.useEffect(() => {
    const retry = () => pending.forEach((qid) => pushOne(qid));
    const t = setInterval(() => pending.size && retry(), 5000);
    window.addEventListener("online", retry);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", retry);
    };
  }, [pending, pushOne]);

  React.useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const submit = React.useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      setSubmitting(true);
      const all = Object.entries(entriesRef.current).map(([questionId, e]) => ({ questionId, answer: e.answer || null, marked: e.marked }));
      for (let attemptNo = 0; attemptNo < 4; attemptNo++) {
        try {
          const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: all, auto }) });
          if (!res.ok) throw new Error();
          submittedRef.current = true;
          try {
            localStorage.removeItem(storageKey);
          } catch {
            /* */
          }
          router.replace(`/student/exams/result/${attemptId}`);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 1500 * (attemptNo + 1)));
        }
      }
      setSubmitting(false);
      toast({ tone: "error", title: "Илгээж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.", description: "Таны хариултууд энэ төхөөрөмж дээр хадгалагдсан." });
    },
    [attemptId, router, storageKey, toast],
  );

  // Таймер
  React.useEffect(() => {
    const t = setInterval(() => {
      const left = deadline - (Date.now() + offset.current);
      setRemaining(left);
      if (left <= 0 && !submittedRef.current) {
        clearInterval(t);
        toast({ tone: "warning", title: "Хугацаа дууслаа. Хариултыг автоматаар илгээж байна…" });
        submit(true);
      }
    }, 500);
    return () => clearInterval(t);
  }, [deadline, submit, toast]);

  const q = questions[idx];
  const e = entries[q.id];
  const answered = questions.filter((x) => entries[x.id]?.answer?.trim()).length;
  const markedCount = questions.filter((x) => entries[x.id]?.marked).length;
  const low = remaining < 60_000;
  const warn = remaining < 5 * 60_000;

  const Grid = (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
      {questions.map((x, i) => {
        const a = entries[x.id];
        return (
          <button
            key={x.id}
            onClick={() => {
              setIdx(i);
              setGridOpen(false);
            }}
            className={cn(
              "relative grid h-10 place-items-center rounded-xl border text-sm font-bold transition-colors",
              i === idx ? "border-primary ring-2 ring-primary/30" : "border-border",
              a?.answer?.trim() ? "bg-primary text-white" : "bg-surface text-muted hover:bg-surface-2",
            )}
            aria-label={`${i + 1}-р асуулт${a?.answer ? ", хариулсан" : ""}${a?.marked ? ", тэмдэглэсэн" : ""}`}
          >
            {i + 1}
            {a?.marked && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-warning ring-2 ring-surface" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      {/* Толгой хэсэг: тогтмол таймер */}
      <div className="sticky top-16 z-10 -mx-4 mb-5 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="flex items-center gap-2 text-xs text-muted">
              {answered}/{questions.length} хариулсан
              {pending.size > 0 && (
                <span className={cn("flex items-center gap-1", offline ? "text-warning" : "text-subtle")}>
                  {offline ? <CloudOff className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
                  {offline ? `Офлайн — ${pending.size} хариулт төхөөрөмж дээр` : "Хадгалж байна…"}
                </span>
              )}
              {pending.size === 0 && <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Хадгалагдсан</span>}
            </p>
          </div>
          <div
            className={cn("flex items-center gap-2 rounded-xl px-3 py-2 font-display text-lg font-semibold tabular-nums", low ? "animate-pulse bg-danger text-white" : warn ? "bg-warning-soft text-warning" : "bg-surface-2")}
            role="timer"
            aria-label={`Үлдсэн хугацаа ${fmt(remaining)}`}
          >
            <Clock className="h-4 w-4" /> {fmt(remaining)}
          </div>
          <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setGridOpen(true)} aria-label="Асуултын жагсаалт">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button onClick={() => setConfirm(true)} className="hidden sm:inline-flex">
            <Send className="h-4 w-4" /> Илгээх
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <Card>
              <CardBody className="space-y-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-muted">
                    Асуулт {idx + 1} / {questions.length} · {q.points} оноо
                  </p>
                  <button
                    onClick={() => update(q.id, { marked: !e?.marked })}
                    className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold", e?.marked ? "bg-warning-soft text-warning" : "text-muted hover:bg-surface-2")}
                    aria-pressed={Boolean(e?.marked)}
                  >
                    <Flag className={cn("h-4 w-4", e?.marked && "fill-current")} /> Дахин харах
                  </button>
                </div>
                <MathText text={q.text} className="text-lg" />

                {q.type === "MULTIPLE_CHOICE" && (
                  <div className="grid gap-2">
                    {q.options.map((o) => {
                      const on = e?.answer === o.label;
                      return (
                        <button
                          key={o.label}
                          onClick={() => update(q.id, { answer: on ? "" : o.label })}
                          className={cn("flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors", on ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong")}
                          aria-pressed={on}
                        >
                          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold", on ? "bg-primary text-white" : "bg-surface-2 text-muted")}>{o.label}</span>
                          <MathText text={o.text} inline />
                        </button>
                      );
                    })}
                  </div>
                )}
                {q.type === "NUMERIC" && (
                  <div className="max-w-sm">
                    <Input value={e?.answer ?? ""} onChange={(ev) => update(q.id, { answer: ev.target.value })} placeholder="Тоон хариу (жишээ нь 12, 3/4, 2; 3)" aria-label="Хариу" />
                    <p className="mt-1.5 text-xs text-subtle">Олон утгыг цэг таслалаар (;) тусгаарлана.</p>
                  </div>
                )}
                {q.type === "EXPRESSION" && <MathEditor value={e?.answer ?? ""} onChange={(v) => update(q.id, { answer: v })} placeholder="Илэрхийллээ бичнэ үү" />}
                {q.type === "OPEN" && (
                  <div>
                    <Textarea value={e?.answer ?? ""} onChange={(ev) => update(q.id, { answer: ev.target.value })} rows={8} placeholder="Бодолтоо дэлгэрэнгүй бичнэ үү. Томьёог $...$ дотор бичиж болно." />
                    <p className="mt-1.5 text-xs text-subtle">Энэ асуултыг багш шалгаж оноо өгнө.</p>
                  </div>
                )}

                <div className="flex justify-between gap-2 border-t border-border pt-5">
                  <Button variant="outline" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
                    <ArrowLeft className="h-4 w-4" /> Өмнөх
                  </Button>
                  {idx < questions.length - 1 ? (
                    <Button onClick={() => setIdx(idx + 1)}>
                      Дараах <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={() => setConfirm(true)}>
                      <Send className="h-4 w-4" /> Дуусгах
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </AnimatePresence>

        <Card className="hidden h-fit lg:block">
          <CardBody>
            <p className="mb-3 text-sm font-semibold">Асуултууд</p>
            {Grid}
            <div className="mt-4 space-y-1.5 text-xs text-muted">
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-primary" /> Хариулсан ({answered})</p>
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-border" /> Хариулаагүй ({questions.length - answered})</p>
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-warning" /> Дахин харах ({markedCount})</p>
            </div>
            <Button className="mt-5 w-full" onClick={() => setConfirm(true)}>
              <Send className="h-4 w-4" /> Шалгалт илгээх
            </Button>
          </CardBody>
        </Card>
      </div>

      {gridOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/50" onClick={() => setGridOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Асуултууд</p>
              <button onClick={() => setGridOpen(false)} aria-label="Хаах"><X className="h-5 w-5" /></button>
            </div>
            {Grid}
            <Button className="mt-5 w-full" onClick={() => { setGridOpen(false); setConfirm(true); }}>
              <Send className="h-4 w-4" /> Шалгалт илгээх
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={confirm}
        onClose={() => !submitting && setConfirm(false)}
        title="Шалгалтаа илгээх үү?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={submitting}>
              Буцах
            </Button>
            <Button onClick={() => submit(false)} loading={submitting}>
              Илгээх
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p>
            Та <b>{answered}</b>/{questions.length} асуултад хариулсан байна.
          </p>
          {questions.length - answered > 0 && (
            <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-warning">
              <AlertTriangle className="h-4 w-4" /> {questions.length - answered} асуулт хариулаагүй байна.
            </p>
          )}
          {markedCount > 0 && <p className="text-muted">{markedCount} асуултыг &quot;дахин харах&quot; гэж тэмдэглэсэн.</p>}
          <p className="text-muted">Илгээсний дараа хариултаа өөрчлөх боломжгүй.</p>
        </div>
      </Modal>
    </div>
  );
}
