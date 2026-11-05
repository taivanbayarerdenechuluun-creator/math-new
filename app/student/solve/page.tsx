import { Suspense } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { isAiConfigured } from "@/services/ai/anthropic";
import { ocrStatus } from "@/services/ocr";
import { PageHeader, Skeleton } from "@/components/ui/primitives";
import { SolverClient } from "./solver-client";

export const metadata = { title: "Бодлого бодох" };

export default async function SolvePage() {
  await requirePageRole(["STUDENT"]);
  const ocr = ocrStatus();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="AI бодогч"
        title="Бодлого бодох"
        description="Бичих, зураг оруулах, камераар авах эсвэл PDF-ээс сонгоод алхам алхмаар тайлбартай бодолт аваарай."
        actions={
          <Link href="/student/saved?tab=history" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-2">
            <History className="h-4 w-4" /> Түүх
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
        <SolverClient aiReady={isAiConfigured()} ocrReady={ocr.mathpix || ocr.vision} />
      </Suspense>
    </div>
  );
}
