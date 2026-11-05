import { History } from "lucide-react";
import { requirePageRole, STAFF } from "@/lib/auth";
import { db, parseJson } from "@/lib/db";
import { isAiConfigured } from "@/services/ai/anthropic";
import { ocrStatus } from "@/services/ocr";
import { loadTopicOptions } from "@/features/question-bank/load";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import { ImportClient } from "./import-client";

export const metadata = { title: "Импорт" };

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  COMPLETED: { label: "Амжилттай", tone: "success" },
  PARTIAL: { label: "Хэсэгчилсэн", tone: "warning" },
  FAILED: { label: "Амжилтгүй", tone: "danger" },
  PROCESSING: { label: "Боловсруулж буй", tone: "info" },
  PENDING: { label: "Хүлээгдэж буй", tone: "neutral" },
};

export default async function ImportPage() {
  const user = await requirePageRole(STAFF);
  const [topics, jobs] = await Promise.all([
    loadTopicOptions(),
    db.questionImportJob.findMany({ where: user.role === "ADMIN" ? {} : { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15, include: { user: { select: { name: true } } } }),
  ]);
  const ocr = ocrStatus();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Бодлогын сан" title="Бодлого импортлох" description="Зураг, скан, PDF-ээс OCR-оор эсвэл CSV/Excel/JSON файлаас бөөнөөр оруулна. Импортолсон бүх бодлого хянах дараалалд орно." />
      <ImportClient topics={topics} ocrReady={ocr.mathpix || ocr.vision} ocrProvider={ocr.mathpix ? "Mathpix" : ocr.vision ? "Claude vision" : null} aiReady={isAiConfigured()} />
      <Card>
        <CardHeader title="Импортын түүх" icon={<History className="h-4 w-4" />} />
        <CardBody className="pt-3">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted">Импорт хийгээгүй байна.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-subtle">
                  <tr>
                    <th className="py-2">Файл</th>
                    <th>Төрөл</th>
                    <th>Төлөв</th>
                    <th>Үр дүн</th>
                    <th>Хэрэглэгч</th>
                    <th>Огноо</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((j) => {
                    const errs = parseJson<{ row: number; message: string }[]>(j.errors, []);
                    return (
                      <tr key={j.id} className="align-top">
                        <td className="max-w-56 truncate py-2.5 font-medium">{j.fileName}</td>
                        <td><Badge tone="neutral">{j.type}</Badge></td>
                        <td><Badge tone={STATUS[j.status]?.tone ?? "neutral"}>{STATUS[j.status]?.label ?? j.status}</Badge></td>
                        <td>
                          <span className="text-success">{j.succeeded} ✓</span> · <span className={j.failed ? "text-danger" : "text-subtle"}>{j.failed} ✗</span>
                          {errs.length > 0 && (
                            <details className="mt-1 text-xs text-muted">
                              <summary className="cursor-pointer">Алдаа ({errs.length})</summary>
                              <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
                                {errs.map((e, i) => <li key={i}>Мөр {e.row}: {e.message}</li>)}
                              </ul>
                            </details>
                          )}
                        </td>
                        <td className="text-muted">{j.user.name}</td>
                        <td className="whitespace-nowrap text-muted">{formatDateTime(j.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
