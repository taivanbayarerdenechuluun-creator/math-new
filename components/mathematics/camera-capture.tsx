"use client";
// Гар утасны камераар бодлого авах. Камер боломжгүй бол файл сонгох fallback.
import * as React from "react";
import { Camera, CameraOff, ImagePlus, RefreshCw, SwitchCamera } from "lucide-react";
import { Alert, Button } from "@/components/ui/primitives";

export function CameraCapture({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [state, setState] = React.useState<"idle" | "starting" | "live" | "denied" | "unsupported" | "error">("idle");
  const [facing, setFacing] = React.useState<"environment" | "user">("environment");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const stop = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = React.useCallback(
    async (mode = facing) => {
      if (!navigator.mediaDevices?.getUserMedia) return setState("unsupported");
      setState("starting");
      stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState("live");
      } catch (e) {
        const name = (e as DOMException).name;
        setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "unsupported" : "error");
      }
    },
    [facing, stop],
  );

  React.useEffect(() => stop, [stop]);

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    stop();
    setState("idle");
    onCapture(c.toDataURL("image/jpeg", 0.92));
  };

  const fallback = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => onCapture(String(r.result));
          r.readAsDataURL(f);
        }}
      />
      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        <ImagePlus className="h-4 w-4" /> Зураг сонгох / авах
      </Button>
    </>
  );

  return (
    <div className="space-y-3">
      <div className="relative grid aspect-[4/3] max-h-[60vh] w-full place-items-center overflow-hidden rounded-2xl bg-navy text-white sm:aspect-video">
        <video ref={videoRef} playsInline muted className={state === "live" ? "absolute inset-0 h-full w-full object-cover" : "hidden"} />
        {state === "live" && (
          <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-white/60">
            <span className="absolute -top-7 left-0 text-xs text-white/80">Бодлогоо хүрээнд багтаана уу</span>
          </div>
        )}
        {state !== "live" && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            {state === "denied" || state === "unsupported" || state === "error" ? <CameraOff className="h-10 w-10 text-white/60" /> : <Camera className="h-10 w-10 text-white/60" />}
            <p className="text-sm text-white/70">{state === "starting" ? "Камер асааж байна…" : "Камераа асааж бодлогын зургийг авна уу"}</p>
          </div>
        )}
      </div>

      {state === "denied" && (
        <Alert tone="warning" title="Камерын зөвшөөрөл олгогдоогүй">
          Хөтчийн тохиргооноос энэ сайтад камер ашиглах зөвшөөрөл өгнө үү, эсвэл доорх товчоор зураг сонгоно уу.
        </Alert>
      )}
      {state === "unsupported" && <Alert tone="info">Энэ төхөөрөмж/хөтөч дээр камер ашиглах боломжгүй байна. Зураг сонгож оруулна уу.</Alert>}
      {state === "error" && <Alert tone="danger">Камер асаахад алдаа гарлаа. Дахин оролдох эсвэл зураг сонгоно уу.</Alert>}

      <div className="flex flex-wrap justify-center gap-2">
        {state === "live" ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                const next = facing === "environment" ? "user" : "environment";
                setFacing(next);
                start(next);
              }}
              aria-label="Камер солих"
            >
              <SwitchCamera className="h-4 w-4" />
            </Button>
            <Button size="lg" onClick={capture}>
              <Camera className="h-5 w-5" /> Зураг авах
            </Button>
          </>
        ) : (
          <>
            {state !== "unsupported" && (
              <Button onClick={() => start()} loading={state === "starting"}>
                {state === "idle" ? <Camera className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} {state === "idle" ? "Камер асаах" : "Дахин оролдох"}
              </Button>
            )}
            {fallback}
          </>
        )}
      </div>
    </div>
  );
}
