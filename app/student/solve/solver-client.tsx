"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  Keyboard,
  Loader2,
  RefreshCcw,
  ScanLine,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Type,
  Upload,
  Wand2,
} from "lucide-react";
import { Alert, Badge, Button, Card, CardBody, Textarea } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { MathEditor } from "@/components/mathematics/math-editor";
import { MathText } from "@/components/mathematics/math-text";
import { SolutionView } from "@/components/mathematics/solution-view";
import { ImageEditor } from "@/components/mathematics/image-editor";
import { CameraCapture } from "@/components/mathematics/camera-capture";
import { PdfPicker } from "@/components/mathematics/pdf-picker";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { SolutionResult } from "@/types/math";
import type { OcrResult, RecognizedQuestion } from "@/services/ai/types";

type Mode = "text" | "image" | "camera" | "pdf";
type Stage = "input" | "edit" | "recognizing" | "review" | "solving" | "result";

const EXAMPLES = [
  "x^2-5x+6=0",
  "\\frac{3}{4}+\\frac{5}{6}",
  "2x+3y=12;\\ x-y=1",
  "x^2-4\\le0",
  "\\frac{d}{dx}\\left(x^3\\sin x\\right)",
  "\\frac{x^2-1}{x-1}=3",
];

export function SolverClient({ aiReady, ocrReady }: { aiReady: boolean; ocrReady: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const initialMode = (["text", "image", "camera", "pdf"].includes(params.get("mode") ?? "") ? params.get("mode") : "text") as Mode;
  const [mode, setMode] = React.useState<Mode>(initialMode);
  const [stage, setStage] = React.useState<Stage>("input");
  const [textKind, setTextKind] = React.useState<"math" | "plain">("math");
  const [latex, setLatex] = React.useState(params.get("q") ?? "");
  const [plain, setPlain] = React.useState("");

  // Зургийн урсгал
  const [rawImage, setRawImage] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [fileId, setFileId] = React.useState<string | null>(null);
  const [ocr, setOcr] = React.useState<OcrResult | null>(null);
  const [ocrError, setOcrError] = React.useState<string | null>(null);
  const [picked, setPicked] = React.useState(0);
  const [reviewText, setReviewText] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);

  const [result, setResult] = React.useState<{ id: string; solution: SolutionResult } | null>(null);
  const [solveError, setSolveError] = React.useState<string | null>(null);
  const [fav, setFav] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const dropRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const reset = () => {
    setStage("input");
    setRawImage(null);
    setPreview(null);
    setFileId(null);
    setOcr(null);
    setOcrError(null);
    setReviewText("");
    setConfirmed(false);
    setResult(null);
    setSolveError(null);
    setFav(false);
    setFeedback(null);
  };

  const acceptFile = (f: File | undefined) => {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast({ tone: "error", title: "Зөвхөн JPG, PNG, WebP зураг оруулна уу." });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast({ tone: "error", title: "Зургийн хэмжээ 10MB-аас бага байх ёстой." });
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      setRawImage(String(r.result));
      setStage("edit");
    };
    r.readAsDataURL(f);
  };

  const pickQuestion = (q: RecognizedQuestion | undefined) => {
    if (!q) return setReviewText("");
    const opts = q.options.length ? "\n" + q.options.map((o) => `${o.label}) ${o.text}`).join("\n") : "";
    setReviewText(q.text + opts);
    setConfirmed(false);
  };

  const recognize = async (blob: Blob, previewUrl: string) => {
    setPreview(previewUrl);
    setStage("recognizing");
    setOcrError(null);
    const fd = new FormData();
    fd.append("file", new File([blob], "problem.jpg", { type: "image/jpeg" }));
    try {
      const r = await api<{ fileId: string; ocr: OcrResult | null; error?: string; warning?: string }>("/api/solver/recognize", { method: "POST", body: fd });
      setFileId(r.fileId);
      setOcr(r.ocr);
      setOcrError(r.error ?? r.warning ?? null);
      setPicked(0);
      pickQuestion(r.ocr?.questions[0]);
      setStage("review");
    } catch (e) {
      setOcrError((e as Error).message);
      setStage("review");
    }
  };

  const solve = async (input: string, inputType: "TEXT" | "IMAGE" | "CAMERA" | "PDF", forceAi = false) => {
    setStage("solving");
    setSolveError(null);
    try {
      const r = await api<{ id: string; solution: SolutionResult; achievements: { title: string }[] }>("/api/solver/solve", {
        method: "POST",
        json: { input, inputType, originalText: ocr?.rawText ?? null, imageFileId: fileId, forceAi },
      });
      setResult(r);
      setFav(false);
      setFeedback(null);
      setStage("result");
      r.achievements.forEach((a) => toast({ tone: "info", title: `🏆 Шинэ амжилт: ${a.title}` }));
    } catch (e) {
      setSolveError((e as Error).message);
      setStage(inputType === "TEXT" ? "input" : "review");
    }
  };

  const submitText = () => {
    const input = textKind === "math" ? latex.trim() : plain.trim();
    if (!input) return toast({ tone: "warning", title: "Бодлогоо оруулна уу." });
    solve(textKind === "math" ? input : input, "TEXT");
  };

  const patchHistory = async (data: Record<string, unknown>) => {
    if (!result) return;
    try {
      const r = await api<{ isFavorite: boolean; feedback: string | null }>(`/api/solver/history/${result.id}`, { method: "PATCH", json: data });
      setFav(r.isFavorite);
      setFeedback(r.feedback);
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    }
  };

  const typeForMode: Record<Mode, "IMAGE" | "CAMERA" | "PDF" | "TEXT"> = { text: "TEXT", image: "IMAGE", camera: "CAMERA", pdf: "PDF" };

  return (
    <div className="space-y-5">
      {stage !== "result" && stage !== "solving" && (
        <Tabs
          value={mode}
          onChange={(m) => {
            reset();
            setMode(m);
            router.replace(`/student/solve?mode=${m}`, { scroll: false });
          }}
          tabs={[
            { value: "text", label: "Бичих", icon: <Keyboard className="h-4 w-4" /> },
            { value: "image", label: "Зураг", icon: <ImagePlus className="h-4 w-4" /> },
            { value: "camera", label: "Камер", icon: <Camera className="h-4 w-4" /> },
            { value: "pdf", label: "PDF", icon: <FileText className="h-4 w-4" /> },
          ]}
        />
      )}

      {!aiReady && stage === "input" && (
        <Alert tone="info" icon={<Sparkles className="h-4 w-4 text-info" />} title="AI тохируулагдаагүй байна">
          Тэгшитгэл, систем, тэнцэтгэл биш, уламжлал, тоон илэрхийллийг тооцооллын хөдөлгүүр алхам алхмаар бодно. Текст бодлого болон зураг таних функц AI түлхүүр тохируулсны дараа ажиллана.
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {/* ── Текст оролт ── */}
        {stage === "input" && mode === "text" && (
          <motion.div key="text" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardBody className="space-y-4 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Бодлогоо оруулна уу</p>
                  <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-semibold">
                    <button onClick={() => setTextKind("math")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1.5", textKind === "math" ? "bg-surface shadow-soft" : "text-muted")} aria-pressed={textKind === "math"}>
                      <Wand2 className="h-3.5 w-3.5" /> Томьёо
                    </button>
                    <button onClick={() => setTextKind("plain")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1.5", textKind === "plain" ? "bg-surface shadow-soft" : "text-muted")} aria-pressed={textKind === "plain"}>
                      <Type className="h-3.5 w-3.5" /> Текст бодлого
                    </button>
                  </div>
                </div>
                {textKind === "math" ? (
                  <>
                    <MathEditor value={latex} onChange={setLatex} placeholder="\text{Жишээ: } x^2-5x+6=0" autoFocus />
                    <p className="text-xs text-subtle">
                      Систем тэгшитгэлийг <code className="rounded bg-surface-2 px-1">;</code>-ээр тусгаарлана. Бутархай: <code className="rounded bg-surface-2 px-1">/</code>, зэрэг: <code className="rounded bg-surface-2 px-1">^</code>, язгуур: <code className="rounded bg-surface-2 px-1">sqrt</code>.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLES.map((ex) => (
                        <button key={ex} onClick={() => setLatex(ex)} className="rounded-lg border border-border bg-surface-2/60 px-2.5 py-1.5 text-sm hover:border-primary/40 hover:bg-primary-soft/40">
                          <MathText text={`$${ex}$`} inline />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Textarea
                      value={plain}
                      onChange={(e) => setPlain(e.target.value)}
                      rows={5}
                      placeholder="Жишээ: Тэгш өнцөгтийн урт нь өргөнөөсөө 3 см-ээр урт, периметр нь 26 см бол талбайг ол. Томьёог $...$ дотор бичиж болно."
                    />
                    {plain.includes("$") && (
                      <div className="rounded-xl bg-surface-2/60 px-4 py-3">
                        <p className="mb-1 text-xs font-medium text-subtle">Урьдчилан харах</p>
                        <MathText text={plain} />
                      </div>
                    )}
                  </>
                )}
                {solveError && <Alert tone="danger" icon={<AlertTriangle className="h-4 w-4 text-danger" />}>{solveError}</Alert>}
                <div className="flex justify-end">
                  <Button size="lg" onClick={submitText}>
                    <Sparkles className="h-4 w-4" /> Бодох
                  </Button>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* ── Зураг оруулах ── */}
        {stage === "input" && mode === "image" && (
          <motion.div key="image" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <input ref={dropRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => acceptFile(e.target.files?.[0])} />
            <button
              onClick={() => dropRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                acceptFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-colors",
                dragOver ? "border-primary bg-primary-soft/50" : "border-border-strong bg-surface hover:border-primary hover:bg-primary-soft/20",
              )}
            >
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Upload className="h-8 w-8" />
              </div>
              <p className="font-display text-lg font-semibold">Зургаа энд чирж оруулах</p>
              <p className="text-sm text-muted">эсвэл дарж сонгоно уу · JPG, PNG, WebP · 10MB хүртэл</p>
            </button>
            {!ocrReady && <p className="mt-3 text-center text-xs text-warning">OCR тохируулагдаагүй тул зургийг таних боломжгүй — зургаа харж байгаад бодлогоо гараар бичих боломжтой.</p>}
          </motion.div>
        )}

        {stage === "input" && mode === "camera" && (
          <motion.div key="camera" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardBody>
                <CameraCapture
                  onCapture={(d) => {
                    setRawImage(d);
                    setStage("edit");
                  }}
                />
              </CardBody>
            </Card>
          </motion.div>
        )}

        {stage === "input" && mode === "pdf" && (
          <motion.div key="pdf" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardBody>
                <PdfPicker
                  onPage={(d) => {
                    setRawImage(d);
                    setStage("edit");
                  }}
                />
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* ── Тайрах / эргүүлэх ── */}
        {stage === "edit" && rawImage && (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardBody>
                <p className="mb-3 text-sm font-semibold">Зургийг тохируулах</p>
                <ImageEditor src={rawImage} onCancel={reset} onDone={recognize} />
              </CardBody>
            </Card>
          </motion.div>
        )}

        {stage === "recognizing" && (
          <motion.div key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="overflow-hidden">
              <div className="grid gap-0 md:grid-cols-2">
                <div className="relative bg-navy">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {preview && <img src={preview} alt="Оруулсан бодлого" className="max-h-80 w-full object-contain opacity-80" />}
                  <motion.div className="absolute inset-x-0 h-1 bg-accent shadow-[0_0_20px_4px_var(--accent)]" animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
                </div>
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <ScanLine className="h-10 w-10 text-primary" />
                  <p className="font-display text-lg font-semibold">Бодлогыг таньж байна…</p>
                  <p className="text-sm text-muted">Томьёо, тэмдэгт, бутархай, хувилбаруудыг уншиж байна</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Танилтыг шалгах ── */}
        {stage === "review" && (
          <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardBody className="space-y-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-semibold">Танигдсан бодлогыг шалгана уу</p>
                    <p className="text-sm text-muted">Алдаатай уншигдсан тэмдэгт байвал засаад баталгаажуулна уу. Шалгаагүй бодлогыг бодохгүй.</p>
                  </div>
                  {ocr && (
                    <Badge tone={ocr.confidence >= 0.85 ? "success" : ocr.confidence >= 0.6 ? "warning" : "danger"}>
                      Итгэл {Math.round(ocr.confidence * 100)}% · {ocr.provider === "MATHPIX" ? "Mathpix" : "AI vision"}
                    </Badge>
                  )}
                </div>
                {ocrError && <Alert tone="warning" icon={<AlertTriangle className="h-4 w-4 text-warning" />}>{ocrError} Доорх талбарт бодлогоо гараар бичиж болно.</Alert>}
                {solveError && <Alert tone="danger">{solveError}</Alert>}

                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Эх зураг</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {preview && <img src={preview} alt="Эх зураг" className="max-h-96 w-full rounded-xl border border-border bg-white object-contain" />}
                  </div>
                  <div className="space-y-3">
                    {ocr && ocr.questions.length > 1 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Олдсон бодлогууд ({ocr.questions.length}) — нэгийг сонгоно уу</p>
                        <div className="flex flex-wrap gap-2">
                          {ocr.questions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setPicked(i);
                                pickQuestion(q);
                              }}
                              className={cn("rounded-lg border px-3 py-1.5 text-sm font-semibold", picked === i ? "border-primary bg-primary text-white" : "border-border hover:border-border-strong")}
                            >
                              {q.number ? `№${q.number}` : `${i + 1}`}
                              {q.confidence < 0.7 && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-warning" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Бодлогын нөхцөл (засах боломжтой)</p>
                      <Textarea
                        value={reviewText}
                        onChange={(e) => {
                          setReviewText(e.target.value);
                          setConfirmed(false);
                        }}
                        rows={6}
                        className="font-mono text-[0.85rem]"
                        placeholder="Бодлогоо энд бичнэ үү. Томьёог $...$ дотор LaTeX-ээр бичнэ: $x^2-5x+6=0$"
                      />
                    </div>
                    {reviewText.trim() && (
                      <div className="rounded-xl border border-border bg-surface-2/50 px-4 py-3">
                        <p className="mb-1 text-xs font-medium text-subtle">Урьдчилан харах</p>
                        <MathText text={reviewText} />
                      </div>
                    )}
                    <label className="flex items-start gap-2.5 rounded-xl bg-primary-soft/50 px-3 py-2.5 text-sm">
                      <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                      <span>Бодлогын нөхцөл эх зурагтай яг таарч байгааг шалгасан</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <Button variant="ghost" onClick={reset}>
                    <ArrowLeft className="h-4 w-4" /> Шинээр эхлэх
                  </Button>
                  <Button size="lg" disabled={!confirmed || !reviewText.trim()} onClick={() => solve(reviewText.trim(), typeForMode[mode])}>
                    <CheckCircle2 className="h-4 w-4" /> Баталгаажуулж бодох
                  </Button>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {stage === "solving" && (
          <motion.div key="solving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="p-10 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-display text-lg font-semibold">Бодож байна…</p>
              <p className="mt-1 text-sm text-muted">Алхам бүрийг тайлбарлаж, хариуг бие даан шалгаж байна</p>
              <div className="mx-auto mt-6 max-w-md space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-4 rounded" style={{ width: `${90 - i * 18}%` }} />
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {stage === "result" && result && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" onClick={reset}>
                <ArrowLeft className="h-4 w-4" /> Шинэ бодлого
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant={fav ? "primary" : "outline"} size="sm" onClick={() => patchHistory({ isFavorite: !fav })} aria-pressed={fav}>
                  <Star className={cn("h-4 w-4", fav && "fill-current")} /> {fav ? "Хадгалсан" : "Хадгалах"}
                </Button>
                <Link
                  href={`/student/tutor?problem=${encodeURIComponent(result.solution.problem)}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2"
                >
                  <Bot className="h-4 w-4" /> AI багштай ярилцах
                </Link>
                {result.solution.engine === "SYMBOLIC" && aiReady && (
                  <Button variant="outline" size="sm" onClick={() => solve(result.solution.problem.replace(/^\$|\$$/g, ""), "TEXT", true)}>
                    <RefreshCcw className="h-4 w-4" /> AI-аар дэлгэрэнгүй тайлбарлах
                  </Button>
                )}
              </div>
            </div>
            <SolutionView s={result.solution} />
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm font-semibold">Энэ тайлбар ойлгомжтой байсан уу?</p>
              <div className="flex gap-2">
                <Button size="sm" variant={feedback === "HELPFUL" ? "success" : "outline"} onClick={() => patchHistory({ feedback: "HELPFUL" })}>
                  <ThumbsUp className="h-4 w-4" /> Тийм
                </Button>
                <Button size="sm" variant={feedback === "NOT_HELPFUL" ? "danger" : "outline"} onClick={() => patchHistory({ feedback: "NOT_HELPFUL" })}>
                  <ThumbsDown className="h-4 w-4" /> Үгүй
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
