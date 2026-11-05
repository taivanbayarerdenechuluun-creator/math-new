"use client";
// Зураг тайрах, эргүүлэх, тодруулах (grayscale + contrast). Үр дүн — JPEG blob.
import * as React from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Check, RotateCcw, RotateCw, SunMedium, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderEdited(src: string, area: Area, rotation: number, enhance: boolean): Promise<Blob> {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bw = img.width * cos + img.height * sin;
  const bh = img.width * sin + img.height * cos;

  // 1) эргүүлсэн бүтэн зураг
  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = bw;
  rotCanvas.height = bh;
  const rctx = rotCanvas.getContext("2d")!;
  rctx.translate(bw / 2, bh / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);

  // 2) тайрах + хэт том зургийг жижигрүүлэх (OCR-д 2000px хангалттай)
  const scale = Math.min(1, 2000 / Math.max(area.width, area.height));
  const out = document.createElement("canvas");
  out.width = Math.round(area.width * scale);
  out.height = Math.round(area.height * scale);
  const ctx = out.getContext("2d")!;
  if (enhance) ctx.filter = "grayscale(1) contrast(1.45) brightness(1.08)";
  ctx.drawImage(rotCanvas, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);
  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("Зургийг боловсруулж чадсангүй"))), "image/jpeg", 0.9));
}

export function ImageEditor({ src, onDone, onCancel }: { src: string; onDone: (blob: Blob, previewUrl: string) => void; onCancel: () => void }) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [enhance, setEnhance] = React.useState(false);
  const [area, setArea] = React.useState<Area | null>(null);
  const [busy, setBusy] = React.useState(false);

  return (
    <div className="space-y-3">
      <div className="relative h-[min(60vh,440px)] overflow-hidden rounded-2xl bg-navy" style={enhance ? { filter: "grayscale(1) contrast(1.45) brightness(1.08)" } : undefined}>
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={undefined as unknown as number}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={(_, px) => setArea(px)}
          objectFit="contain"
          showGrid
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setRotation((r) => r - 90)} aria-label="Зүүн тийш эргүүлэх">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRotation((r) => r + 90)} aria-label="Баруун тийш эргүүлэх">
          <RotateCw className="h-4 w-4" />
        </Button>
        <label className="flex flex-1 items-center gap-2 px-2 text-xs text-muted">
          Нарийн эргүүлэх
          <input type="range" min={-45} max={45} step={1} value={((rotation % 90) + 90) % 90 > 45 ? (rotation % 90) - 90 : rotation % 90} onChange={(e) => setRotation(Math.round(rotation / 90) * 90 + Number(e.target.value))} className="flex-1 accent-[var(--primary)]" />
        </label>
        <label className="flex items-center gap-2 px-2 text-xs text-muted">
          Томруулах
          <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-24 accent-[var(--primary)]" />
        </label>
        <Button variant={enhance ? "primary" : "outline"} size="sm" onClick={() => setEnhance(!enhance)} aria-pressed={enhance}>
          <SunMedium className="h-4 w-4" /> Тодруулах
        </Button>
      </div>
      <p className="text-xs text-subtle">Зөвхөн бодох бодлогоо хүрээнд оруулж тайрвал таних нарийвчлал сайжирна.</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" /> Болих
        </Button>
        <Button
          loading={busy}
          disabled={!area}
          onClick={async () => {
            if (!area) return;
            setBusy(true);
            try {
              const blob = await renderEdited(src, area, rotation, enhance);
              onDone(blob, URL.createObjectURL(blob));
            } finally {
              setBusy(false);
            }
          }}
          className={cn(!area && "opacity-50")}
        >
          <Check className="h-4 w-4" /> Баталгаажуулах
        </Button>
      </div>
    </div>
  );
}
