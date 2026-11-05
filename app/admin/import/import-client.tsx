"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText, ImagePlus, Loader2, ScanText, Sparkles, Upload, XCircle } from "lucide-react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { PdfPicker } from "@/components/mathematics/pdf-picker";
import { MathText } from "@/components/mathematics/math-text";
import type { TopicOption } from "@/components/questions/question-editor";
import { api } from "@/lib/client";
import { GRADES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OcrResult } from "@/services/ai/types";

interface Detected {
  key: string;
  text: string;
  rawText: string;
  options: { label: string; text: string }[];
  fileId: string | null;
  preview: string;
  confidence: number;
  number: string | null;
  selected: boolean;
  source: string;
}

async function dataUrlToBlob(d: string) {
  return (await fetch(d)).blob();
}

/** Том зургийг 2000px хүртэл багасгаж JPEG болгох */
async function normalizeImage(src: string): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Зураг хөрвүүлэхэд алдаа"))), "image/jpeg", 0.9));
}

function OcrImport({ topics, kind, aiReady, ocrReady }: { topics: TopicOption[]; kind: "IMAGE" | "PDF"; aiReady: boolean; ocrReady: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = React.useState<Detected[]>([]);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = React.useState<string[]>([]);
  const [grade, setGrade] = React.useState(9);
  const [topicId, setTopicId] = React.useState("");
  const [sourceName, setSourceName] = React.useState("");
  const [useAi, setUseAi] = React.useState(aiReady);
  const [committing, setCommitting] = React.useState(false);
  const [result, setResult] = React.useState<{ succeeded: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const [fileName, setFileName] = React.useState("scan");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const processImages = async (sources: { dataUrl: string; label: string }[]) => {
    setResult(null);
    setFailures([]);
    setProgress({ done: 0, total: sources.length });
    for (const [i, s] of sources.entries()) {
      try {
        const blob = await normalizeImage(s.dataUrl);
        const fd = new FormData();
        fd.append("file", new File([blob], "page.jpg", { type: "image/jpeg" }));
        fd.append("purpose", "QUESTION_IMPORT");
        const r = await api<{ fileId: string; ocr: OcrResult | null; error?: string }>("/api/solver/recognize", { method: "POST", body: fd });
        if (!r.ocr) {
          setFailures((f) => [...f, `${s.label}: ${r.error ?? "танигдсангүй"}`]);
        } else {
          const preview = URL.createObjectURL(blob);
          setItems((xs) => [
            ...xs,
            ...r.ocr!.questions.map((q, k) => ({
              key: `${r.fileId}-${k}`,
              text: q.text,
              rawText: q.text + (q.options.length ? "\n" + q.options.map((o) => `${o.label}) ${o.text}`).join("\n") : ""),
              options: q.options,
              fileId: r.fileId,
              preview,
              confidence: q.confidence,
              number: q.number,
              selected: true,
              source: s.label,
            })),
          ]);
          if (r.ocr.questions.length === 0) setFailures((f) => [...f, `${s.label}: бодлого олдсонгүй`]);
        }
      } catch (e) {
        setFailures((f) => [...f, `${s.label}: ${(e as Error).message}`]);
      }
      setProgress({ done: i + 1, total: sources.length });
    }
    setProgress(null);
  };

  const onImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].filter((f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type)).slice(0, 20);
    if (list.length < files.length) toast({ tone: "warning", title: "Зөвхөн JPG/PNG/WebP, нэг удаад 20 хүртэл зураг." });
    setFileName(list.map((f) => f.name).join(", ").slice(0, 190));
    const sources = await Promise.all(
      list.map(
        (f) =>
          new Promise<{ dataUrl: string; label: string }>((res) => {
            const r = new FileReader();
            r.onload = () => res({ dataUrl: String(r.result), label: f.name });
            r.readAsDataURL(f);
          }),
      ),
    );
    processImages(sources);
  };

  const commit = async () => {
    const chosen = items.filter((i) => i.selected && i.text.trim());
    if (!chosen.length) return toast({ tone: "warning", title: "Импортлох бодлого сонгоно уу." });
    setCommitting(true);
    try {
      const r = await api<{ succeeded: number; failed: number; errors: { row: number; message: string }[] }>("/api/admin/import/ocr-commit", {
        method: "POST",
        json: {
          kind,
          fileName,
          gradeId: grade,
          topicId: topicId || null,
          sourceName: sourceName || null,
          structureWithAi: useAi,
          items: chosen.map((c) => ({ text: c.text, rawText: c.rawText, options: c.options, fileId: c.fileId, confidence: c.confidence })),
        },
      });
      setResult(r);
      setItems((xs) => xs.filter((x) => !x.selected));
      toast({ tone: r.failed ? "warning" : "success", title: `${r.succeeded} бодлого хянах дараалалд нэмэгдлээ` });
      router.refresh();
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    } finally {
      setCommitting(false);
    }
  };

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="space-y-5">
      {!ocrReady && (
        <Alert tone="warning" icon={<AlertTriangle className="h-4 w-4 text-warning" />} title="OCR тохируулагдаагүй">
          MATHPIX_APP_ID/MATHPIX_APP_KEY эсвэл ANTHROPIC_API_KEY-г .env-д тохируулсны дараа зураг/PDF-ээс бодлого таних боломжтой. Түүнээс өмнө бодлогыг &quot;Шинэ бодлого&quot; хэсгээс гараар эсвэл CSV/Excel-ээр оруулна уу.
        </Alert>
      )}
      <Card>
        <CardBody>
          {kind === "IMAGE" ? (
            <>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple capture={undefined} className="hidden" onChange={(e) => onImages(e.target.files)} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={!ocrReady || Boolean(progress)}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border-strong px-6 py-10 text-center hover:border-primary hover:bg-primary-soft/20 disabled:opacity-50"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <ImagePlus className="h-7 w-7" />
                </div>
                <p className="font-semibold">Зураг сонгох (олныг сонгож болно)</p>
                <p className="text-sm text-muted">Сурах бичгийн хуудас, гар бичмэл дасгал, шалгалтын хуудас · JPG/PNG/WebP · 20 хүртэл</p>
              </button>
            </>
          ) : (
            <PdfPicker
              multiple
              onPages={(pages) => {
                setFileName(`PDF (${pages.map((p) => p.page).join(", ")}-р хуудас)`);
                processImages(pages.map((p) => ({ dataUrl: p.dataUrl, label: `${p.page}-р хуудас` })));
              }}
            />
          )}
          {progress && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary-soft px-4 py-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Таньж байна… {progress.done}/{progress.total}
              <div className="h-1.5 flex-1 rounded-full bg-surface">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}
          {failures.length > 0 && (
            <Alert tone="warning" className="mt-4" title="Зарим хуудсыг таньж чадсангүй">
              <ul className="list-disc pl-4">{failures.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </Alert>
          )}
        </CardBody>
      </Card>

      {result && (
        <Alert tone={result.failed ? "warning" : "success"} title={`${result.succeeded} амжилттай, ${result.failed} алдаатай`}>
          {result.errors.map((e, i) => <p key={i}>#{e.row}: {e.message}</p>)}
          <Link href="/admin/review" className="font-semibold text-primary underline">Хянах дараалал руу очих →</Link>
        </Alert>
      )}

      {items.length > 0 && (
        <Card>
          <CardHeader title={`Танигдсан бодлогууд (${items.length})`} description="Импортлохоосоо өмнө текстийг засах, хэрэггүйг сонголтоос хасах боломжтой" icon={<ScanText className="h-4 w-4" />} />
          <CardBody className="space-y-4">
            <div className="grid gap-3 rounded-xl bg-surface-2/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Анги">
                <Select value={grade} onChange={(e) => { setGrade(Number(e.target.value)); setTopicId(""); }}>
                  {GRADES.map((g) => <option key={g} value={g}>{g}-р анги</option>)}
                </Select>
              </Field>
              <Field label="Сэдэв">
                <Select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                  <option value="">— Дараа нь сонгоно —</option>
                  {topics.filter((t) => t.gradeId === grade).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </Select>
              </Field>
              <Field label="Эх сурвалж">
                <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Жишээ нь: Математик 9, 2023" />
              </Field>
              <label className={cn("flex items-center gap-2.5 self-end rounded-xl border border-border bg-surface px-3 py-2.5 text-sm", !aiReady && "opacity-50")}>
                <input type="checkbox" checked={useAi} disabled={!aiReady} onChange={(e) => setUseAi(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                <Sparkles className="h-4 w-4 text-primary" /> AI-аар бүтэцжүүлэх
              </label>
            </div>
            {useAi && <p className="text-xs text-warning">AI санал болгосон хариу, төрөл нь баталгаажаагүй тул хянагч заавал шалгана.</p>}
            <div className="space-y-3">
              {items.map((it, i) => (
                <div key={it.key} className={cn("grid gap-3 rounded-xl border p-3 md:grid-cols-[160px_1fr]", it.selected ? "border-primary/40" : "border-border opacity-60")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.preview} alt="" className="max-h-40 w-full rounded-lg border border-border bg-white object-contain" />
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input type="checkbox" checked={it.selected} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, selected: e.target.checked } : x)))} className="h-4 w-4 accent-[var(--primary)]" />
                        {it.number ? `№${it.number}` : `#${i + 1}`}
                      </label>
                      <Badge tone="neutral">{it.source}</Badge>
                      <Badge tone={it.confidence >= 0.85 ? "success" : it.confidence >= 0.6 ? "warning" : "danger"}>Итгэл {Math.round(it.confidence * 100)}%</Badge>
                      {it.options.length > 0 && <Badge tone="info">{it.options.length} хувилбар</Badge>}
                    </div>
                    <Textarea value={it.text} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} rows={3} className="font-mono text-xs" />
                    <div className="rounded-lg bg-surface-2/50 px-3 py-2 text-sm">
                      <MathText text={it.text} />
                      {it.options.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-x-4 text-muted">
                          {it.options.map((o) => <span key={o.label}>{o.label}) <MathText text={o.text} inline /></span>)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={commit} loading={committing} disabled={!selectedCount}>
                <Upload className="h-4 w-4" /> Сонгосон {selectedCount} бодлогыг импортлох
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

interface PreviewRow {
  row: number;
  ok: boolean;
  duplicate: boolean;
  errors: string[];
  preview: { text: string; grade: number | null; type: string; correct: string | null; topic: string | null };
}

function BulkImport() {
  const router = useRouter();
  const toast = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [rows, setRows] = React.useState<PreviewRow[] | null>(null);
  const [busy, setBusy] = React.useState<"preview" | "commit" | null>(null);
  const [result, setResult] = React.useState<{ succeeded: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const ref = React.useRef<HTMLInputElement>(null);

  const send = async (mode: "preview" | "commit", f = file) => {
    if (!f) return;
    setBusy(mode);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("mode", mode);
    try {
      if (mode === "preview") {
        const r = await api<{ rows: PreviewRow[] }>("/api/admin/import/bulk", { method: "POST", body: fd });
        setRows(r.rows);
        setResult(null);
      } else {
        const r = await api<{ succeeded: number; failed: number; errors: { row: number; message: string }[] }>("/api/admin/import/bulk", { method: "POST", body: fd });
        setResult(r);
        setRows(null);
        toast({ tone: r.failed ? "warning" : "success", title: `${r.succeeded} бодлого импортлогдлоо` });
        router.refresh();
      }
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const downloadErrors = () => {
    const errs = result?.errors ?? rows?.filter((r) => !r.ok).map((r) => ({ row: r.row, message: r.errors.join("; ") })) ?? [];
    const csv = "﻿row,error\n" + errs.map((e) => `${e.row},"${e.message.replace(/"/g, '""')}"`).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const valid = rows?.filter((r) => r.ok).length ?? 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm text-muted">Загвар татаж аваад бөглөнө үү:</p>
            {(["csv", "xlsx", "json"] as const).map((f) => (
              <a key={f} href={`/api/admin/import/template?format=${f}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-surface-2">
                <Download className="h-3.5 w-3.5" /> {f.toUpperCase()}
              </a>
            ))}
          </div>
          <div className="rounded-xl bg-surface-2/50 p-3 text-xs text-muted">
            <p className="font-semibold text-fg">Баганууд:</p>
            <p className="mt-1 font-mono">grade, topic (slug эсвэл нэр), type (MULTIPLE_CHOICE | NUMERIC | EXPRESSION | OPEN), difficulty (1–5), text, optionA…optionE, correct, tolerance, explanation, tags, source</p>
          </div>
          <input
            ref={ref}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f) send("preview", f);
              e.target.value = "";
            }}
          />
          <button onClick={() => ref.current?.click()} className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-strong px-6 py-8 hover:border-primary hover:bg-primary-soft/20">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <span className="font-semibold">{file ? file.name : "CSV, XLSX эсвэл JSON файл сонгох"}</span>
            {busy === "preview" && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        </CardBody>
      </Card>

      {result && (
        <Alert tone={result.failed ? "warning" : "success"} title={`${result.succeeded} амжилттай · ${result.failed} алдаатай`}>
          Импортолсон бодлогууд хянах дараалалд орлоо.{" "}
          {result.failed > 0 && (
            <button onClick={downloadErrors} className="font-semibold text-primary underline">
              Алдааны тайлан татах
            </button>
          )}{" "}
          — алдаатай мөрүүдийг засаад дахин оруулбал зөвхөн тэдгээр нь нэмэгдэнэ (давхардлыг автоматаар алгасна).
        </Alert>
      )}

      {rows && (
        <Card>
          <CardHeader
            title="Урьдчилан харах"
            description={`${rows.length} мөр · ${valid} зөв · ${rows.length - valid} алдаатай`}
            action={
              <div className="flex gap-2">
                {rows.length - valid > 0 && (
                  <Button size="sm" variant="outline" onClick={downloadErrors}>
                    <Download className="h-4 w-4" /> Алдаа
                  </Button>
                )}
                <Button size="sm" onClick={() => send("commit")} loading={busy === "commit"} disabled={!valid}>
                  <Upload className="h-4 w-4" /> {valid} мөр импортлох
                </Button>
              </div>
            }
          />
          <CardBody>
            <div className="max-h-[480px] overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-0 bg-surface-2 text-left text-xs uppercase text-subtle">
                  <tr>
                    <th className="px-3 py-2">Мөр</th>
                    <th className="px-3 py-2">Төлөв</th>
                    <th className="px-3 py-2">Анги</th>
                    <th className="px-3 py-2">Бодлого</th>
                    <th className="px-3 py-2">Хариу</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.row} className={cn("align-top", !r.ok && "bg-danger-soft/40")}>
                      <td className="px-3 py-2 font-mono text-xs">{r.row}</td>
                      <td className="px-3 py-2">
                        {r.ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-danger" />}
                      </td>
                      <td className="px-3 py-2">{r.preview.grade ?? "—"}</td>
                      <td className="max-w-md px-3 py-2">
                        <MathText text={r.preview.text || "—"} inline />
                        {r.errors.length > 0 && <p className="mt-1 text-xs text-danger">{r.errors.join(" · ")}</p>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.preview.correct ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export function ImportClient({ topics, ocrReady, ocrProvider, aiReady }: { topics: TopicOption[]; ocrReady: boolean; ocrProvider: string | null; aiReady: boolean }) {
  const [tab, setTab] = React.useState<"image" | "pdf" | "bulk">("image");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "image", label: "Зураг / скан", icon: <ImagePlus className="h-4 w-4" /> },
            { value: "pdf", label: "PDF", icon: <FileText className="h-4 w-4" /> },
            { value: "bulk", label: "CSV · Excel · JSON", icon: <FileSpreadsheet className="h-4 w-4" /> },
          ]}
        />
        {ocrProvider && <Badge tone="success">OCR: {ocrProvider}</Badge>}
      </div>
      {tab === "image" && <OcrImport key="img" topics={topics} kind="IMAGE" aiReady={aiReady} ocrReady={ocrReady} />}
      {tab === "pdf" && <OcrImport key="pdf" topics={topics} kind="PDF" aiReady={aiReady} ocrReady={ocrReady} />}
      {tab === "bulk" && <BulkImport />}
    </div>
  );
}
