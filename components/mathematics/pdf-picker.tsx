"use client";
// PDF-ийг хөтөч дээр задалж, хуудас сонгоод зураг болгон хувиргана (pdf.js).
import * as React from "react";
import { FileText, Loader2 } from "lucide-react";
import { Alert, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => Promise<void> };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
};

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

export async function renderPage(doc: PdfDoc, n: number, scale: number): Promise<string> {
  const page = await doc.getPage(n);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function usePdf(file: File | null) {
  const [doc, setDoc] = React.useState<PdfDoc | null>(null);
  const [thumbs, setThumbs] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let loaded: PdfDoc | null = null;
    setLoading(true);
    setError(null);
    setThumbs([]);
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const data = new Uint8Array(await file.arrayBuffer());
        loaded = (await pdfjs.getDocument({ data }).promise) as unknown as PdfDoc;
        if (cancelled) return;
        setDoc(loaded);
        const max = Math.min(loaded.numPages, 40);
        for (let i = 1; i <= max; i++) {
          const t = await renderPage(loaded, i, 0.3);
          if (cancelled) return;
          setThumbs((xs) => [...xs, t]);
        }
      } catch {
        if (!cancelled) setError("PDF файлыг нээж чадсангүй. Файл гэмтсэн эсвэл нууц үгтэй байж болзошгүй.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      loaded?.destroy().catch(() => null);
    };
  }, [file]);

  return { doc, thumbs, error, loading };
}

export function PdfPicker({
  onPage,
  multiple = false,
  onPages,
}: {
  onPage?: (dataUrl: string, pageNumber: number) => void;
  multiple?: boolean;
  onPages?: (pages: { dataUrl: string; page: number }[]) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const { doc, thumbs, error, loading } = usePdf(file);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [rendering, setRendering] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const confirm = async () => {
    if (!doc || selected.length === 0) return;
    setRendering(true);
    try {
      const pages = [];
      for (const p of [...selected].sort((a, b) => a - b)) pages.push({ dataUrl: await renderPage(doc, p, 2), page: p });
      if (multiple) onPages?.(pages);
      else onPage?.(pages[0].dataUrl, pages[0].page);
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 25 * 1024 * 1024) return alert("PDF файлын хэмжээ 25MB-аас бага байх ёстой.");
          setSelected([]);
          setFile(f);
        }}
      />
      {!file ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border-strong bg-surface-2/40 px-6 py-12 text-center transition-colors hover:border-primary hover:bg-primary-soft/30"
        >
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <FileText className="h-7 w-7" />
          </div>
          <p className="font-semibold">PDF файл сонгох</p>
          <p className="text-sm text-muted">Сурах бичиг, даалгаврын хуудас (25MB хүртэл). Файл таны төхөөрөмж дээр задлагдана.</p>
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm">
              <span className="font-semibold">{file.name}</span>
              {doc && <span className="text-muted"> · {doc.numPages} хуудас</span>}
            </p>
            <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
              Өөр файл
            </Button>
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <p className="text-sm text-muted">{multiple ? "Боловсруулах хуудсуудаа сонгоно уу." : "Бодлого байгаа хуудсаа сонгоно уу."}</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
            {thumbs.map((t, i) => {
              const n = i + 1;
              const on = selected.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => setSelected(multiple ? (on ? selected.filter((x) => x !== n) : [...selected, n]) : [n])}
                  className={cn("overflow-hidden rounded-xl border-2 bg-white transition-all", on ? "border-primary ring-4 ring-primary/20" : "border-border hover:border-border-strong")}
                  aria-pressed={on}
                  aria-label={`${n}-р хуудас`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t} alt="" className="w-full" />
                  <p className={cn("py-1 text-xs font-semibold", on ? "bg-primary text-white" : "bg-surface-2 text-muted")}>{n}</p>
                </button>
              );
            })}
            {loading && (
              <div className="grid aspect-[3/4] place-items-center rounded-xl border border-dashed border-border">
                <Loader2 className="h-5 w-5 animate-spin text-subtle" />
              </div>
            )}
          </div>
          {doc && doc.numPages > 40 && <p className="text-xs text-subtle">Эхний 40 хуудсыг харуулж байна.</p>}
          <div className="flex justify-end">
            <Button onClick={confirm} disabled={selected.length === 0} loading={rendering}>
              {multiple ? `${selected.length} хуудас боловсруулах` : "Хуудсыг сонгох"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
