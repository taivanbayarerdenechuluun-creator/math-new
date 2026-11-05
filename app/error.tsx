"use client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">Алдаа гарлаа</h1>
        <p className="mt-2 text-muted">Хуудсыг ачаалахад алдаа гарлаа. Таны оруулсан мэдээлэл хадгалагдсан байж болзошгүй — дахин оролдоно уу.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-subtle">Код: {error.digest}</p>}
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="h-4 w-4" /> Дахин оролдох
        </Button>
      </div>
    </div>
  );
}
