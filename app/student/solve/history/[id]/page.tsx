import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { db, parseJson } from "@/lib/db";
import { Badge, Card, CardBody } from "@/components/ui/primitives";
import { SolutionView } from "@/components/mathematics/solution-view";
import { MathText } from "@/components/mathematics/math-text";
import { formatDateTime } from "@/lib/utils";
import type { SolutionResult } from "@/types/math";
import { HistoryActions } from "./history-actions";

const INPUT_LABEL: Record<string, string> = { TEXT: "Бичсэн", IMAGE: "Зураг", CAMERA: "Камер", PDF: "PDF" };

export default async function HistoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(["STUDENT"]);
  const { id } = await params;
  const p = await db.solvedProblem.findUnique({ where: { id } });
  if (!p || p.userId !== user.id) notFound();
  const solution = parseJson<SolutionResult | null>(p.solution, null);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/student/saved?tab=history" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Түүх рүү буцах
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{INPUT_LABEL[p.inputType] ?? p.inputType}</Badge>
          <span className="text-sm text-muted">{formatDateTime(p.createdAt)}</span>
        </div>
        <HistoryActions id={p.id} isFavorite={p.isFavorite} />
      </div>
      {p.imageFileId && (
        <Card>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Эх зураг</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${p.imageFileId}`} alt="Эх зураг" className="max-h-72 w-full rounded-xl border border-border bg-white object-contain" />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Баталгаажуулсан нөхцөл</p>
              <MathText text={p.recognizedLatex ?? ""} />
            </div>
          </CardBody>
        </Card>
      )}
      {solution ? <SolutionView s={solution} /> : <p className="text-muted">Бодолтыг уншиж чадсангүй.</p>}
    </div>
  );
}
