"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeCheck, Calculator, Eye, ImagePlus, Plus, Save, Send, Sigma, Sparkles, Trash2, X } from "lucide-react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { MathEditor } from "@/components/mathematics/math-editor";
import { MathText, Tex } from "@/components/mathematics/math-text";
import { api } from "@/lib/client";
import { DIFFICULTY_LABELS, GRADES, QUESTION_TYPE_LABELS, QUESTION_TYPES, type QuestionType } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type { TopicOption, QuestionDraft } from "./draft";
import type { TopicOption, QuestionDraft } from "./draft";

const LABELS = ["A", "B", "C", "D", "E"];

function PreviewBox({ text, className }: { text: string; className?: string }) {
  if (!text.trim()) return null;
  return (
    <div className={cn("rounded-xl border border-border bg-surface-2/40 px-3.5 py-2.5", className)}>
      <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-subtle">
        <Eye className="h-3 w-3" /> Урьдчилан харах
      </p>
      <MathText text={text} />
    </div>
  );
}

export function QuestionEditor({
  topics,
  initial,
  questionId,
  aiReady,
  onSaved,
  compact = false,
}: {
  topics: TopicOption[];
  initial: QuestionDraft;
  questionId?: string;
  aiReady: boolean;
  onSaved?: (id: string) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = React.useState<QuestionDraft>(initial);
  const [saving, setSaving] = React.useState<"draft" | "review" | null>(null);
  const [errors, setErrors] = React.useState<string | null>(null);
  const [formulaModal, setFormulaModal] = React.useState<null | { target: "text" | "explanation" | "related" }>(null);
  const [formulaLatex, setFormulaLatex] = React.useState("");
  const [check, setCheck] = React.useState<{ status: string; message: string; engineLatex?: string } | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [suggesting, setSuggesting] = React.useState(false);
  const [aiNote, setAiNote] = React.useState(false);
  const textRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const set = <K extends keyof QuestionDraft>(k: K, v: QuestionDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const gradeTopics = topics.filter((t) => t.gradeId === d.gradeId);

  const insertFormula = () => {
    if (!formulaLatex.trim() || !formulaModal) return;
    if (formulaModal.target === "related") set("relatedFormulas", [...d.relatedFormulas, formulaLatex]);
    else {
      const key = formulaModal.target;
      const el = key === "text" ? textRef.current : null;
      const snippet = `$${formulaLatex}$`;
      if (el && typeof el.selectionStart === "number") {
        const s = el.selectionStart;
        set(key, d[key].slice(0, s) + snippet + d[key].slice(el.selectionEnd));
      } else set(key, (d[key] ? d[key] + " " : "") + snippet);
    }
    setFormulaLatex("");
    setFormulaModal(null);
  };

  const payload = () => ({
    gradeId: d.gradeId,
    topicId: d.topicId,
    type: d.type,
    difficulty: d.difficulty,
    title: d.title || null,
    text: d.text,
    correctAnswer: d.type === "MULTIPLE_CHOICE" || d.type === "OPEN" ? null : d.correctAnswer || null,
    tolerance: d.type === "NUMERIC" && d.tolerance ? Number(d.tolerance.replace(",", ".")) : null,
    explanation: d.explanation || null,
    relatedFormulas: d.relatedFormulas,
    tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean),
    sourceName: d.sourceName || null,
    options: d.type === "MULTIPLE_CHOICE" ? d.options.filter((o) => o.text.trim()) : [],
    solutionMethod: d.solutionMethod || null,
    solutionSteps: d.solutionSteps.filter((s) => s.title.trim() || s.explanation.trim() || s.latex.trim()),
    originalFileId: d.originalFileId,
  });

  const save = async (submitForReview: boolean) => {
    setErrors(null);
    if (d.type === "MULTIPLE_CHOICE" && d.options.filter((o) => o.isCorrect).length !== 1) {
      if (submitForReview) return setErrors("Сонгох хариулттай бодлогод яг нэг зөв хувилбар тэмдэглэнэ үү.");
    }
    setSaving(submitForReview ? "review" : "draft");
    try {
      if (questionId) {
        await api(`/api/admin/questions/${questionId}`, { method: "PUT", json: payload() });
        toast({ tone: "success", title: "Хадгалагдлаа" });
        onSaved?.(questionId);
        router.refresh();
      } else {
        const r = await api<{ id: string; code: string }>("/api/admin/questions", { method: "POST", json: { ...payload(), submitForReview } });
        toast({ tone: "success", title: `${r.code} үүслээ`, description: submitForReview ? "Хянуулахаар илгээгдлээ." : "Ноорог хэлбэрээр хадгалагдлаа." });
        onSaved?.(r.id);
        router.push(`/admin/questions/${r.id}`);
      }
    } catch (e) {
      setErrors((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const runCheck = async () => {
    setChecking(true);
    try {
      const r = await api<{ status: string; message: string; engineLatex?: string }>("/api/admin/questions/assist", {
        method: "POST",
        json: { action: "check", text: d.text, type: d.type, correctAnswer: d.correctAnswer || null, tolerance: d.tolerance ? Number(d.tolerance) : null },
      });
      setCheck(r);
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    } finally {
      setChecking(false);
    }
  };

  const suggest = async () => {
    setSuggesting(true);
    try {
      const { suggestion: s } = await api<{
        suggestion: { text: string; type: QuestionType; options: { label: string; text: string }[]; suggestedAnswer: string | null; suggestedSolution: string | null; grade: number | null; difficulty: number };
      }>("/api/admin/questions/assist", { method: "POST", json: { action: "suggest", text: d.text } });
      setD((x) => ({
        ...x,
        type: s.type,
        difficulty: Math.min(5, Math.max(1, Math.round(s.difficulty) || x.difficulty)),
        gradeId: s.grade && s.grade >= 6 && s.grade <= 12 ? s.grade : x.gradeId,
        options:
          s.type === "MULTIPLE_CHOICE" && s.options.length
            ? s.options.slice(0, 5).map((o, i) => ({ label: LABELS[i], text: o.text, isCorrect: (s.suggestedAnswer ?? "").trim().toUpperCase() === o.label.toUpperCase() }))
            : x.options,
        correctAnswer: s.type !== "MULTIPLE_CHOICE" && s.suggestedAnswer ? s.suggestedAnswer : x.correctAnswer,
        explanation: x.explanation || s.suggestedSolution || "",
      }));
      setAiNote(true);
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    } finally {
      setSuggesting(false);
    }
  };

  const uploadImage = async (f: File | undefined) => {
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await api<{ fileId: string }>("/api/admin/upload", { method: "POST", body: fd });
      set("originalFileId", r.fileId);
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    }
  };

  return (
    <div className="space-y-5">
      {errors && <Alert tone="danger" icon={<AlertTriangle className="h-4 w-4 text-danger" />}>{errors}</Alert>}
      {aiNote && (
        <Alert tone="warning" icon={<Sparkles className="h-4 w-4 text-warning" />} title="AI-ийн санал оруулагдлаа">
          AI-ийн санал болгосон төрөл, хувилбар, хариу нь БАТАЛГААЖААГҮЙ. Хариу бүрийг өөрөө шалгаж засна уу.
        </Alert>
      )}

      <Card>
        <CardHeader title="Ерөнхий мэдээлэл" />
        <CardBody className={cn("grid gap-4 sm:grid-cols-2", !compact && "lg:grid-cols-4")}>
          <Field label="Анги">
            <Select value={d.gradeId} onChange={(e) => setD({ ...d, gradeId: Number(e.target.value), topicId: null })}>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}-р анги
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Сэдэв" className={compact ? "sm:col-span-2" : "lg:col-span-2"}>
            <Select value={d.topicId ?? ""} onChange={(e) => set("topicId", e.target.value || null)}>
              <option value="">— Сэдэв сонгоогүй —</option>
              {gradeTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.unit} › {t.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Хүндрэл">
            <Select value={d.difficulty} onChange={(e) => set("difficulty", Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} — {DIFFICULTY_LABELS[n]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Асуултын төрөл" className="sm:col-span-2">
            <div className="grid grid-cols-2 gap-1.5">
              {QUESTION_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => set("type", t)} className={cn("h-10 rounded-xl border px-2 text-xs font-semibold", d.type === t ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:border-border-strong")} aria-pressed={d.type === t}>
                  {QUESTION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Гарчиг (заавал биш)">
            <Input value={d.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Эх сурвалж">
            <Input value={d.sourceName} onChange={(e) => set("sourceName", e.target.value)} placeholder="Сурах бичиг, шалгалт…" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Бодлогын нөхцөл"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setFormulaModal({ target: "text" })}>
                <Sigma className="h-4 w-4" /> Томьёо
              </Button>
              {aiReady && (
                <Button size="sm" variant="outline" onClick={suggest} loading={suggesting} disabled={d.text.trim().length < 5}>
                  <Sparkles className="h-4 w-4" /> AI санал
                </Button>
              )}
            </div>
          }
        />
        <CardBody className="space-y-3">
          <Textarea ref={textRef} value={d.text} onChange={(e) => set("text", e.target.value)} rows={compact ? 4 : 5} className="font-mono text-[0.85rem]" placeholder="Бодлогын нөхцөл. Томьёог $...$ дотор LaTeX-ээр бичнэ: $x^2 - 5x + 6 = 0$" />
          <PreviewBox text={d.text} />
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} />
            {d.originalFileId ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/${d.originalFileId}`} alt="Лавлах зураг" className="h-20 rounded-lg border border-border bg-white object-contain" />
                <Button size="sm" variant="ghost" onClick={() => set("originalFileId", null)}>
                  <X className="h-4 w-4" /> Зураг хасах
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-4 w-4" /> Лавлах зураг (дүрс, график)
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Хариу" />
        <CardBody className="space-y-3">
          {d.type === "MULTIPLE_CHOICE" && (
            <>
              <p className="text-xs text-subtle">Зөв хариултын дугуйг сонгоно уу.</p>
              {d.options.map((o, i) => (
                <div key={o.label} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => set("options", d.options.map((x, j) => ({ ...x, isCorrect: j === i })))}
                    className={cn("mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold", o.isCorrect ? "bg-success text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}
                    aria-label={`${o.label} зөв хариулт`}
                    aria-pressed={o.isCorrect}
                  >
                    {o.label}
                  </button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Input value={o.text} onChange={(e) => set("options", d.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder={`${o.label} хувилбар ($LaTeX$ ашиглаж болно)`} />
                    {o.text.includes("$") && <MathText text={o.text} inline className="px-1 text-sm" />}
                  </div>
                  {d.options.length > 2 && (
                    <button type="button" onClick={() => set("options", d.options.filter((_, j) => j !== i).map((x, j) => ({ ...x, label: LABELS[j] })))} className="mt-1 rounded-lg p-2 text-subtle hover:text-danger" aria-label="Хасах">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {d.options.length < 5 && (
                <Button size="sm" variant="ghost" onClick={() => set("options", [...d.options, { label: LABELS[d.options.length], text: "", isCorrect: false }])}>
                  <Plus className="h-4 w-4" /> Хувилбар нэмэх
                </Button>
              )}
            </>
          )}
          {d.type === "NUMERIC" && (
            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <Field label="Зөв хариу" hint="Олон утга бол ; тусгаарлана. π-г pi гэж бичиж болно (жишээ: 10*pi).">
                <Input value={d.correctAnswer} onChange={(e) => set("correctAnswer", e.target.value)} placeholder="12 эсвэл 3/4 эсвэл 2; 3" />
              </Field>
              <Field label="Зөвшөөрөх алдаа" hint="Хоосон бол яг тэнцүү">
                <Input value={d.tolerance} onChange={(e) => set("tolerance", e.target.value)} placeholder="0.01" inputMode="decimal" />
              </Field>
            </div>
          )}
          {d.type === "EXPRESSION" && (
            <Field label="Зөв илэрхийлэл" hint="Тэнцүү хэлбэрийн бүх илэрхийллийг зөвд тооцно (жишээ нь (x+1)^2 = x^2+2x+1).">
              <MathEditor value={d.correctAnswer} onChange={(v) => set("correctAnswer", v)} />
            </Field>
          )}
          {d.type === "OPEN" && <Alert tone="info">Нээлттэй бодлогыг шалгалтад багш гараар үнэлнэ. Доорх бодолт, тайлбарыг үнэлгээний жишиг болгон бөглөнө үү.</Alert>}

          {(d.type === "NUMERIC" || d.type === "EXPRESSION") && (
            <div className="space-y-2 border-t border-border pt-3">
              <Button size="sm" variant="outline" onClick={runCheck} loading={checking} disabled={!d.text.trim()}>
                <Calculator className="h-4 w-4" /> Хариуг тооцооллоор шалгах
              </Button>
              {check && (
                <div
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-sm",
                    check.status === "MATCH" ? "bg-success-soft text-success" : check.status === "MISMATCH" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted",
                  )}
                >
                  <p className="font-semibold">{check.message}</p>
                  {check.engineLatex && (
                    <p className="mt-1 text-fg">
                      Хөдөлгүүрийн хариу: <Tex tex={check.engineLatex} />
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Бодолт ба тайлбар" />
        <CardBody className="space-y-4">
          <Field label="Товч тайлбар">
            <Textarea value={d.explanation} onChange={(e) => set("explanation", e.target.value)} rows={3} placeholder="Яагаад ийм хариу гарахыг товч тайлбарлана" />
          </Field>
          <PreviewBox text={d.explanation} />
          <Field label="Бодолтын арга (заавал биш)">
            <Input value={d.solutionMethod} onChange={(e) => set("solutionMethod", e.target.value)} placeholder="Жишээ нь: Дискриминантын арга" />
          </Field>
          <div className="space-y-3">
            <p className="text-sm font-medium">Алхам алхмаар бодолт</p>
            {d.solutionSteps.map((s, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                  <Input value={s.title} onChange={(e) => set("solutionSteps", d.solutionSteps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Алхмын нэр" />
                  <button onClick={() => set("solutionSteps", d.solutionSteps.filter((_, j) => j !== i))} className="rounded-lg p-2 text-subtle hover:text-danger" aria-label="Алхам устгах">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Input value={s.latex} onChange={(e) => set("solutionSteps", d.solutionSteps.map((x, j) => (j === i ? { ...x, latex: e.target.value } : x)))} placeholder="LaTeX илэрхийлэл ($ тэмдэггүй)" className="font-mono text-xs" />
                {s.latex && <Tex tex={s.latex} display />}
                <Textarea value={s.explanation} onChange={(e) => set("solutionSteps", d.solutionSteps.map((x, j) => (j === i ? { ...x, explanation: e.target.value } : x)))} rows={2} placeholder="Энэ алхмыг яагаад хийж байгааг тайлбарлана" />
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => set("solutionSteps", [...d.solutionSteps, { title: "", latex: "", explanation: "" }])}>
              <Plus className="h-4 w-4" /> Алхам нэмэх
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Холбогдох томьёо</p>
            <div className="flex flex-wrap gap-2">
              {d.relatedFormulas.map((f, i) => (
                <span key={i} className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1">
                  <Tex tex={f} />
                  <button onClick={() => set("relatedFormulas", d.relatedFormulas.filter((_, j) => j !== i))} aria-label="Хасах" className="text-subtle hover:text-danger">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setFormulaModal({ target: "related" })}>
                <Plus className="h-4 w-4" /> Томьёо
              </Button>
            </div>
          </div>
          <Field label="Шошго" hint="Таслалаар тусгаарлана">
            <Input value={d.tags} onChange={(e) => set("tags", e.target.value)} placeholder="квадрат, дискриминант" />
          </Field>
        </CardBody>
      </Card>

      <div className="sticky bottom-20 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-float backdrop-blur lg:bottom-4">
        {!questionId && (
          <Badge tone="neutral" className="mr-auto self-center">
            <BadgeCheck className="h-3.5 w-3.5" /> Шинэ бодлого баталгаажуулалт хүлээнэ
          </Badge>
        )}
        <Button variant="outline" onClick={() => save(false)} loading={saving === "draft"}>
          <Save className="h-4 w-4" /> {questionId ? "Хадгалах" : "Ноорог хадгалах"}
        </Button>
        {!questionId && (
          <Button onClick={() => save(true)} loading={saving === "review"}>
            <Send className="h-4 w-4" /> Хянуулахаар илгээх
          </Button>
        )}
      </div>

      <Modal
        open={Boolean(formulaModal)}
        onClose={() => setFormulaModal(null)}
        title="Томьёо оруулах"
        description="Математик гар эсвэл LaTeX ашиглан бичнэ үү"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormulaModal(null)}>
              Болих
            </Button>
            <Button onClick={insertFormula} disabled={!formulaLatex.trim()}>
              Оруулах
            </Button>
          </>
        }
      >
        <MathEditor value={formulaLatex} onChange={setFormulaLatex} autoFocus />
        <Input className="mt-3 font-mono text-xs" value={formulaLatex} onChange={(e) => setFormulaLatex(e.target.value)} placeholder="LaTeX" aria-label="LaTeX код" />
      </Modal>
    </div>
  );
}
